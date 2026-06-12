#!/usr/bin/env python3
"""Guard firmware modal code against repeated row allocation and ad hoc shells."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
FIRMWARE_DIR = ROOT / "components" / "espcontrol"
FORBIDDEN_ALLOCATIONS = (
    "ClimateOptionClick",
    "FanPresetClick",
    "OptionSelectOptionClick",
)
LAYER_TOP_ALLOWLIST = {
    "button_grid_modal.h",
}
MANUAL_OVERLAY_DELETE_ALLOWLIST = {
    "button_grid_modal.h",
}


def firmware_modal_errors(firmware_dir: Path, root: Path) -> list[str]:
    allocation_pattern = re.compile(r"\bnew\s+(" + "|".join(FORBIDDEN_ALLOCATIONS) + r")\b")
    layer_top_pattern = re.compile(r"\blv_obj_create\s*\(\s*lv_layer_top\s*\(\s*\)\s*\)")
    manual_overlay_delete_pattern = re.compile(r"\blv_obj_del\s*\(\s*(?:ui\.)?(?:menu_)?overlay\s*\)")
    errors: list[str] = []

    for path in sorted(firmware_dir.glob("button_grid*.h")):
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            match = allocation_pattern.search(line)
            if match:
                rel = path.relative_to(root)
                errors.append(
                    f"{rel}:{line_no}: avoid per-row heap allocation for {match.group(1)}"
                )
            if path.name not in LAYER_TOP_ALLOWLIST and layer_top_pattern.search(line):
                rel = path.relative_to(root)
                errors.append(
                    f"{rel}:{line_no}: open modal overlays through button_grid_modal.h helpers"
                )
            if path.name not in MANUAL_OVERLAY_DELETE_ALLOWLIST and manual_overlay_delete_pattern.search(line):
                rel = path.relative_to(root)
                errors.append(
                    f"{rel}:{line_no}: delete modal overlays through button_grid_modal.h lifecycle helpers"
                )
    return errors


def firmware_modal_sleep_takeover_errors(root: Path) -> list[str]:
    firmware_dir = root / "components" / "espcontrol"
    backlight_header_path = firmware_dir / "backlight.h"
    modal_path = firmware_dir / "button_grid_modal.h"
    navigation_path = firmware_dir / "button_grid_navigation.h"
    grid_path = firmware_dir / "button_grid_grid.h"
    backlight_path = root / "common" / "addon" / "backlight.yaml"
    schedule_path = root / "common" / "addon" / "backlight_schedule.yaml"
    errors: list[str] = []

    if not backlight_header_path.exists():
        errors.append("components/espcontrol/backlight.h: provide early display-takeover hook")
    else:
        text = backlight_header_path.read_text(encoding="utf-8")
        if (
            "backlight_close_modals_for_display_takeover" not in text
            or "set_backlight_display_takeover_callback" not in text
        ):
            errors.append("components/espcontrol/backlight.h: expose an early display-takeover modal hook")

    if not modal_path.exists():
        errors.append("components/espcontrol/button_grid_modal.h: provide shared modal lifecycle helpers")
    else:
        text = modal_path.read_text(encoding="utf-8")
        if "control_modal_force_close_active" not in text or "control_modal_close_active_internal(false)" not in text:
            errors.append(
                "components/espcontrol/button_grid_modal.h: provide a forced modal close path for display takeover"
            )

    if not navigation_path.exists():
        errors.append("components/espcontrol/button_grid_navigation.h: close modals before display takeover")
    else:
        text = navigation_path.read_text(encoding="utf-8")
        if (
            "navigation_close_modals_for_display_takeover" not in text
            or "control_modal_force_close_active();" not in text
        ):
            errors.append(
                "components/espcontrol/button_grid_navigation.h: close modals through a display-takeover helper"
            )

    if not grid_path.exists():
        errors.append("components/espcontrol/button_grid_grid.h: register the display-takeover modal hook")
    else:
        text = grid_path.read_text(encoding="utf-8")
        if "set_backlight_display_takeover_callback(navigation_close_modals_for_display_takeover)" not in text:
            errors.append("components/espcontrol/button_grid_grid.h: register the display-takeover modal hook")

    if not backlight_path.exists():
        errors.append("common/addon/backlight.yaml: keep display-off modal guards")
    else:
        text = backlight_path.read_text(encoding="utf-8")
        if "Skipping automatic display-off while image modal is active" not in text:
            errors.append("common/addon/backlight.yaml: keep automatic idle display-off blocked by image modals")
        if "backlight_close_modals_for_display_takeover();" not in text:
            errors.append("common/addon/backlight.yaml: close modals before manual or scheduled display-off")

    if not schedule_path.exists():
        errors.append("common/addon/backlight_schedule.yaml: close modals before scheduled takeover")
    else:
        text = schedule_path.read_text(encoding="utf-8")
        if text.count("backlight_close_modals_for_display_takeover();") < 2:
            errors.append(
                "common/addon/backlight_schedule.yaml: close modals before scheduled sleep and clock takeover"
            )

    return errors


def run_scan() -> int:
    errors = firmware_modal_errors(FIRMWARE_DIR, ROOT)
    errors.extend(firmware_modal_sleep_takeover_errors(ROOT))

    if errors:
        print("Firmware modal allocation check failed:")
        for error in errors:
            print(f"  {error}")
        return 1

    print("Firmware modal allocation checks passed.")
    return 0


def expect_errors(name: str, files: dict[str, str], expected: tuple[str, ...]) -> None:
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        firmware_dir = root / "components" / "espcontrol"
        firmware_dir.mkdir(parents=True)
        for filename, text in files.items():
            (firmware_dir / filename).write_text(text, encoding="utf-8")

        errors = firmware_modal_errors(firmware_dir, root)
        for item in expected:
            assert any(item in error for error in errors), f"{name}: missing {item!r} in {errors!r}"
        if not expected:
            assert not errors, f"{name}: expected no errors, got {errors!r}"


def expect_sleep_takeover_errors(name: str, files: dict[str, str], expected: tuple[str, ...]) -> None:
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        for filename, text in files.items():
            path = root / filename
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")

        errors = firmware_modal_sleep_takeover_errors(root)
        for item in expected:
            assert any(item in error for error in errors), f"{name}: missing {item!r} in {errors!r}"
        if not expected:
            assert not errors, f"{name}: expected no errors, got {errors!r}"


def run_self_test() -> int:
    expect_errors(
        "forbidden click allocation",
        {"button_grid_climate.h": "auto *click = new ClimateOptionClick();\n"},
        ("avoid per-row heap allocation for ClimateOptionClick",),
    )
    expect_errors(
        "ad hoc top layer",
        {"button_grid_climate.h": "lv_obj_t *overlay = lv_obj_create(lv_layer_top());\n"},
        ("open modal overlays through button_grid_modal.h helpers",),
    )
    expect_errors(
        "shared helpers",
        {"button_grid_modal.h": "lv_obj_t *overlay = lv_obj_create(lv_layer_top());\n"},
        (),
    )
    expect_errors(
        "manual overlay delete",
        {"button_grid_media.h": "if (ui.overlay) lv_obj_del(ui.overlay);\n"},
        ("delete modal overlays through button_grid_modal.h lifecycle helpers",),
    )
    expect_errors(
        "shared delete helper",
        {"button_grid_media.h": "control_modal_delete_overlay(ControlModalKind::MEDIA_VOLUME, ui.overlay);\n"},
        (),
    )
    expect_sleep_takeover_errors(
        "missing display takeover close",
        {
            "components/espcontrol/backlight.h": "inline void backlight_close_modals_for_display_takeover() {}\n",
            "components/espcontrol/button_grid_modal.h": "inline void control_modal_close_active() {}\n",
            "components/espcontrol/button_grid_navigation.h": "inline void navigation_hide_modals() {}\n",
            "components/espcontrol/button_grid_grid.h": "inline void grid_phase1() {}\n",
            "common/addon/backlight.yaml": "Skipping automatic display-off while image modal is active\n",
            "common/addon/backlight_schedule.yaml": "script:\n",
        },
        (
            "expose an early display-takeover modal hook",
            "provide a forced modal close path for display takeover",
            "close modals through a display-takeover helper",
            "register the display-takeover modal hook",
            "close modals before manual or scheduled display-off",
            "close modals before scheduled sleep and clock takeover",
        ),
    )
    expect_sleep_takeover_errors(
        "display takeover close",
        {
            "components/espcontrol/backlight.h": (
                "inline void set_backlight_display_takeover_callback(BacklightDisplayTakeoverCallback callback) {}\n"
                "inline void backlight_close_modals_for_display_takeover() {}\n"
            ),
            "components/espcontrol/button_grid_modal.h": (
                "inline void control_modal_close_active_internal(bool honor_close_guard) {}\n"
                "inline void control_modal_force_close_active() { control_modal_close_active_internal(false); }\n"
            ),
            "components/espcontrol/button_grid_navigation.h": (
                "inline void navigation_close_modals_for_display_takeover() {\n"
                "  control_modal_force_close_active();\n"
                "}\n"
            ),
            "components/espcontrol/button_grid_grid.h": (
                "set_backlight_display_takeover_callback(navigation_close_modals_for_display_takeover);\n"
            ),
            "common/addon/backlight.yaml": (
                "Skipping automatic display-off while image modal is active\n"
                "backlight_close_modals_for_display_takeover();\n"
            ),
            "common/addon/backlight_schedule.yaml": (
                "backlight_close_modals_for_display_takeover();\n"
                "backlight_close_modals_for_display_takeover();\n"
            ),
        },
        (),
    )
    print("Firmware modal allocation self-tests passed.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="run guardrail self-tests")
    args = parser.parse_args()
    return run_self_test() if args.self_test else run_scan()


if __name__ == "__main__":
    raise SystemExit(main())
