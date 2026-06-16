"""Search query parsing and queryset building for the /search/ endpoint.

Supported syntax (PLAN.md §1.3):
  *term*       → pg_trgm ILIKE contains  (GIN index on title + body)
  term*        → FTS prefix              (SearchVectorField GIN)
  "two words"  → FTS phrase              (SearchVectorField GIN)
  term         → FTS plain / websearch   (SearchVectorField GIN)

No raw SQL string interpolation.  The term is never logged.
"""

import re

from django.contrib.postgres.search import SearchHeadline, SearchQuery, SearchRank
from django.db.models import FloatField, Q, Value
from django.db.models.functions import Left


def parse_query(q: str) -> dict:
    """Parse user input into mode + cleaned term.  Never raises."""
    q = q.strip()
    if not q:
        return {"mode": "empty", "term": ""}

    # *term*  → trigram contains (at least one char between asterisks)
    if q.startswith("*") and q.endswith("*") and len(q) > 2:
        return {"mode": "trigram", "term": q[1:-1]}

    # term*  → FTS prefix (trailing asterisk, does not start with *)
    if q.endswith("*") and not q.startswith("*") and len(q) > 1:
        return {"mode": "prefix", "term": q[:-1]}

    # "phrase"  → FTS phrase (at least one char between quotes)
    if q.startswith('"') and q.endswith('"') and len(q) > 2:
        return {"mode": "phrase", "term": q[1:-1]}

    return {"mode": "fulltext", "term": q}


def _safe_prefix_word(term: str) -> str:
    """Return the first alphanumeric word from term for use in a raw tsquery.

    Strips characters that have meaning in tsquery syntax so there is no
    risk of injection when building ``word:*``.
    """
    safe = re.sub(r"[^\w\s]", "", term, flags=re.UNICODE).strip()
    words = safe.split()
    return words[0] if words else ""


def build_search_queryset(qs, q: str, sort: str = "relevance"):
    """Apply search filter + sorting + annotations to an already-user-scoped queryset.

    Every result row gains:
      ``rank``    — SearchRank float (FTS modes) or None (trigram / browse)
      ``snippet`` — SearchHeadline excerpt (FTS) or first 200 chars of body

    Returns the annotated, filtered, ordered queryset.
    """
    parsed = parse_query(q)
    mode = parsed["mode"]
    term = parsed["term"]
    fts_query = None

    if mode == "empty":
        pass  # browse-all: no text filter

    elif mode == "trigram":
        qs = qs.filter(Q(title__icontains=term) | Q(body__icontains=term))

    elif mode == "prefix":
        word = _safe_prefix_word(term)
        if not word:
            return qs.none()
        fts_query = SearchQuery(f"{word}:*", search_type="raw")
        qs = qs.filter(search_vector=fts_query)

    elif mode == "phrase":
        fts_query = SearchQuery(term, search_type="phrase")
        qs = qs.filter(search_vector=fts_query)

    else:  # fulltext / websearch
        fts_query = SearchQuery(term, search_type="websearch")
        qs = qs.filter(search_vector=fts_query)

    # Annotate rank + snippet
    if fts_query is not None:
        qs = qs.annotate(
            rank=SearchRank("search_vector", fts_query),
            snippet=SearchHeadline(
                "body",
                fts_query,
                config="english",
                start_sel="**",
                stop_sel="**",
                max_words=25,
                min_words=10,
                max_fragments=1,
            ),
        )
    else:
        qs = qs.annotate(
            rank=Value(None, output_field=FloatField()),
            snippet=Left("body", 200),
        )

    # Sort
    if sort == "date":
        qs = qs.order_by("-date")
    elif sort == "title":
        qs = qs.order_by("title", "-date")
    else:  # relevance (default)
        qs = qs.order_by(*(("-rank", "-date") if fts_query is not None else ("-date",)))

    return qs
