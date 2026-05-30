"""ESPHome external component stub for ESPControl e-paper dashboards."""

import esphome.codegen as cg
import esphome.config_validation as cv
import os

CODEOWNERS = ["@jtenniswood"]

CONFIG_SCHEMA = cv.Schema({})


async def to_code(config):
    comp_dir = os.path.dirname(os.path.abspath(__file__))
    cg.add_build_flag(f"-I{comp_dir}")
