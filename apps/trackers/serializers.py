"""Serializers for the trackers app."""

from decimal import Decimal

from rest_framework import serializers

from apps.trackers.models import DataType, Tracker

# ---------------------------------------------------------------------------
# Tracker (definition) serializers
# ---------------------------------------------------------------------------


class TrackerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tracker
        fields = [
            "id",
            "key",
            "name",
            "data_type",
            "config",
            "is_system",
            "is_active",
            "order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]

    def validate(self, attrs: dict) -> dict:
        instance = self.instance
        request = self.context.get("request")

        if instance is None:
            # Creation: check for duplicate key within this user's trackers.
            key = attrs.get("key")
            if key and request and Tracker.objects.filter(user=request.user, key=key).exists():
                raise serializers.ValidationError(
                    {"key": "A tracker with this key already exists."}
                )
        else:
            if "key" in attrs and attrs["key"] != instance.key:
                raise serializers.ValidationError(
                    {"key": "Key cannot be changed after creation."}
                )
            if "data_type" in attrs and attrs["data_type"] != instance.data_type:
                raise serializers.ValidationError(
                    {"data_type": "Data type cannot be changed after creation."}
                )

        dt = attrs.get("data_type", getattr(instance, "data_type", None))
        config = attrs.get("config", getattr(instance, "config", {})) or {}

        if dt == DataType.OPTION:
            options = config.get("options")
            if not options or not isinstance(options, list) or not all(
                isinstance(o, str) for o in options
            ):
                raise serializers.ValidationError(
                    {"config": "OPTION tracker requires config.options to be a non-empty list of strings."}
                )

        elif dt in (DataType.INTEGER, DataType.FLOAT):
            if "min" in config and "max" in config and config["min"] > config["max"]:
                raise serializers.ValidationError(
                    {"config": "config.min must be <= config.max."}
                )

        return attrs

    def create(self, validated_data: dict) -> Tracker:
        validated_data["is_system"] = False
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# TrackerValue serializers (for the entry/{date}/trackers/ endpoint)
# ---------------------------------------------------------------------------


class TrackerReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tracker
        fields = ["id", "key", "name", "data_type", "config", "is_system", "order"]


class TrackerValueReadSerializer(serializers.Serializer):
    """Represents one tracker + its current value for a given entry."""

    tracker = TrackerReadSerializer()
    value = serializers.SerializerMethodField()

    def get_value(self, obj: dict):
        return obj["value"]


class TrackerValueListSerializer(serializers.ListSerializer):
    def validate(self, data: list) -> list:
        ids = [item["tracker"].pk for item in data]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Duplicate trackers in request.")
        return data


class TrackerValueInputSerializer(serializers.Serializer):
    """Validates one item in the PUT /entries/{date}/trackers/ payload."""

    class Meta:
        list_serializer_class = TrackerValueListSerializer

    tracker = serializers.PrimaryKeyRelatedField(queryset=Tracker.objects.none())
    value = serializers.JSONField(allow_null=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["tracker"].queryset = Tracker.objects.filter(
                user=request.user,
                is_active=True,
            )

    def validate(self, attrs: dict) -> dict:
        tracker: Tracker = attrs["tracker"]
        value = attrs.get("value")

        if value is None:
            return attrs

        dt = tracker.data_type
        config = tracker.config or {}

        if dt == DataType.BOOLEAN:
            if not isinstance(value, bool):
                raise serializers.ValidationError(
                    {"value": f"Tracker '{tracker.key}' expects a boolean (true/false)."}
                )

        elif dt == DataType.INTEGER:
            if isinstance(value, bool) or not isinstance(value, int):
                raise serializers.ValidationError(
                    {"value": f"Tracker '{tracker.key}' expects an integer."}
                )
            _check_bounds(tracker.key, value, config)

        elif dt == DataType.FLOAT:
            if isinstance(value, bool) or not isinstance(value, int | float):
                raise serializers.ValidationError(
                    {"value": f"Tracker '{tracker.key}' expects a number."}
                )
            _check_bounds(tracker.key, float(value), config)

        elif dt == DataType.TEXT:
            if not isinstance(value, str):
                raise serializers.ValidationError(
                    {"value": f"Tracker '{tracker.key}' expects a string."}
                )

        elif dt == DataType.OPTION:
            options = config.get("options", [])
            if not isinstance(value, str) or value not in options:
                raise serializers.ValidationError(
                    {
                        "value": (
                            f"Tracker '{tracker.key}': '{value}' is not a valid option. "
                            f"Choices: {options}"
                        )
                    }
                )

        return attrs


def _check_bounds(key: str, value: int | float, config: dict) -> None:
    if "min" in config and value < config["min"]:
        raise serializers.ValidationError(
            {"value": f"Tracker '{key}': value must be >= {config['min']}."}
        )
    if "max" in config and value > config["max"]:
        raise serializers.ValidationError(
            {"value": f"Tracker '{key}': value must be <= {config['max']}."}
        )


def value_to_fields(tracker: Tracker, value) -> dict:
    """Map a validated Python value to the correct TrackerValue column."""
    dt = tracker.data_type
    if dt in (DataType.TEXT, DataType.OPTION):
        return {"value_text": value, "value_number": None, "value_bool": None}
    if dt in (DataType.INTEGER, DataType.FLOAT):
        return {"value_text": None, "value_number": Decimal(str(value)), "value_bool": None}
    if dt == DataType.BOOLEAN:
        return {"value_text": None, "value_number": None, "value_bool": value}
    return {"value_text": None, "value_number": None, "value_bool": None}
