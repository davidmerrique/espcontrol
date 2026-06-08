#!/usr/bin/env python3
"""Validate the per-device devices/*/profile.json files before generators consume them."""

from __future__ import annotations

import sys

from device_profiles import (
    DEVICES_SOURCE_LABEL,
    DeviceProfileError,
    load_manifest_data,
    validate_manifest_data,
)


def main() -> int:
    try:
        data = load_manifest_data()
    except DeviceProfileError as exc:
        print(f"ERROR: {exc}")
        return 1

    errors = validate_manifest_data(data)
    if errors:
        print(f"ERROR: {DEVICES_SOURCE_LABEL} failed validation:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(f"{DEVICES_SOURCE_LABEL} passed validation.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
