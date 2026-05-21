// Alarm card: state-aware alarm_control_panel card with generated action page.
function alarmUsesDefaultIcon(icon) {
  return !icon || icon === "Auto" || icon === "Security" || icon === "Alarm";
}

function createAlarmActionButton(alarm, mode) {
  var info = alarmActionInfo(mode) || ALARM_ACTIONS[0];
  return normalizeButtonConfig({
    entity: alarm.entity || "",
    label: info.label,
    icon: info.icon,
    icon_on: "Auto",
    sensor: info.value,
    unit: "",
    type: "alarm_action",
    precision: "",
    options: normalizeAlarmOptions(alarm.options),
  });
}

function alarmCardTypeOptions(includeFullSetup) {
  var options = [];
  if (includeFullSetup) options.push({ value: "alarm", label: "Full Setup" });
  for (var i = 0; i < ALARM_ACTIONS.length; i++) options.push(ALARM_ACTIONS[i]);
  return options;
}

function alarmLabelIsGenerated(label) {
  if (!label) return true;
  for (var i = 0; i < ALARM_ACTIONS.length; i++) {
    if (label === ALARM_ACTIONS[i].label) return true;
  }
  return false;
}

function alarmIconIsGenerated(icon) {
  if (!icon || icon === "Auto" || alarmUsesDefaultIcon(icon)) return true;
  for (var i = 0; i < ALARM_ACTIONS.length; i++) {
    if (icon === ALARM_ACTIONS[i].icon) return true;
  }
  return false;
}

function setAlarmCardType(b, value, helpers) {
  var info = alarmActionInfo(value);
  var wasAlarmAction = b.type === "alarm_action";

  if (!info) {
    b.type = "alarm";
    b.sensor = "";
    b.unit = "";
    b.precision = "";
    b.icon_on = "Auto";
    if (alarmLabelIsGenerated(b.label)) b.label = "";
    if (alarmIconIsGenerated(b.icon)) b.icon = "Security";
    b.options = normalizeAlarmOptions(b.options);
  } else {
    var oldInfo = alarmActionInfo(b.sensor);
    var shouldUseGeneratedLabel = !wasAlarmAction || alarmLabelIsGenerated(b.label);
    var shouldUseGeneratedIcon = !wasAlarmAction || alarmIconIsGenerated(b.icon) ||
      (oldInfo && b.icon === oldInfo.icon);

    b.type = "alarm_action";
    b.sensor = info.value;
    b.unit = "";
    b.precision = "";
    b.icon_on = "Auto";
    if (shouldUseGeneratedLabel) b.label = info.label;
    if (shouldUseGeneratedIcon) b.icon = info.icon;
    b.options = normalizeAlarmOptions(b.options);
  }

  helpers.saveField("type", b.type);
  helpers.saveField("sensor", b.sensor || "");
  helpers.saveField("unit", "");
  helpers.saveField("precision", "");
  helpers.saveField("icon_on", "Auto");
  helpers.saveField("label", b.label || "");
  helpers.saveField("icon", b.icon || "Auto");
  helpers.saveField("options", b.options || "");
  renderButtonSettings();
}

function renderAlarmCardTypeField(panel, b, helpers) {
  var includeFullSetup = !helpers.isSub || b.type === "alarm";
  var value = b.type === "alarm" ? "alarm" :
    ((alarmActionInfo(b.sensor) || ALARM_ACTIONS[0]).value);
  panel.appendChild(helpers.selectField(
    "Type",
    helpers.idPrefix + "alarm-card-type",
    alarmCardTypeOptions(includeFullSetup),
    value,
    function () {
      setAlarmCardType(b, this.value, helpers);
    }
  ).field);
}

function syncAlarmActionSubpage(slot, alarm) {
  if (!slot || !alarm) return;
  var sp = getSubpage(slot);
  buildSubpageGrid(sp);

  var visible = alarmVisibleActions(alarm);
  var byMode = {};
  for (var i = 0; i < sp.buttons.length; i++) {
    var child = sp.buttons[i];
    if (!child || child.type !== "alarm_action") continue;
    var mode = alarmActionInfo(child.sensor) ? child.sensor : "";
    if (!mode) continue;
    byMode[mode] = child;
    child.entity = alarm.entity || "";
    child.options = normalizeAlarmOptions(alarm.options);
  }

  for (var vi = 0; vi < visible.length; vi++) {
    var action = visible[vi];
    if (byMode[action]) continue;
    var newSlot = subpageFirstFreeSlot(sp);
    while (sp.buttons.length < newSlot) sp.buttons.push({ entity: "", label: "", icon: "Auto", icon_on: "Auto", sensor: "", unit: "", type: "", precision: "", options: "" });
    sp.buttons[newSlot - 1] = createAlarmActionButton(alarm, action);
    var pos = findPlacementCell(sp.grid, 0, 1, NUM_SLOTS);
    if (pos >= 0) placeSlotAt(sp.grid, newSlot, pos, 1);
  }

  sp.order = serializeSubpageGrid(sp);
  saveSubpageEntity(slot);
}

registerButtonType("alarm", {
  label: "Alarm",
  allowInSubpage: false,
  hideLabel: true,
  labelPlaceholder: "e.g. House Alarm",
  experimental: "developer",
  onSelect: function (b) {
    b.entity = "";
    b.label = "";
    b.sensor = "";
    b.unit = "";
    b.precision = "";
    b.icon = "Security";
    b.icon_on = "Auto";
    b.options = "";
  },
  renderSettings: function (panel, b, slot, helpers) {
    b.sensor = "";
    b.unit = "";
    b.precision = "";
    b.icon_on = "Auto";
    if (!b.icon || b.icon === "Auto") b.icon = "Security";
    var normalizedOptions = normalizeAlarmOptions(b.options);
    if (b.options !== normalizedOptions) {
      b.options = normalizedOptions;
      helpers.saveField("options", normalizedOptions);
    }

    renderAlarmCardTypeField(panel, b, helpers);

    var entityField = helpers.entityField(
      "Alarm Entity",
      helpers.idPrefix + "alarm-entity",
      b.entity,
      "e.g. alarm_control_panel.house",
      ["alarm_control_panel"],
      "entity",
      true,
      "Add an alarm_control_panel entity before saving."
    );
    panel.appendChild(entityField.field);

    panel.appendChild(helpers.textField(
      "Label", helpers.idPrefix + "alarm-label", b.label, "e.g. House Alarm", "label", true).field);

    panel.appendChild(helpers.iconPickerField(
      helpers.idPrefix + "alarm-icon-picker", helpers.idPrefix + "alarm-icon",
      b.icon || "Security", function (opt) {
        b.icon = opt || "Security";
        helpers.saveField("icon", b.icon);
      }, "Icon"
    ));

    function savePinOptions() {
      setAlarmPinRequired(b, "arm", armPinToggle.input.checked);
      setAlarmPinRequired(b, "disarm", disarmPinToggle.input.checked);
      helpers.saveField("options", b.options);
    }

    var armPinToggle = helpers.toggleRow(
      "PIN required for arming",
      helpers.idPrefix + "alarm-pin-arm",
      alarmPinRequired(b, "arm")
    );
    var disarmPinToggle = helpers.toggleRow(
      "PIN required for disarming",
      helpers.idPrefix + "alarm-pin-disarm",
      alarmPinRequired(b, "disarm")
    );
    panel.appendChild(armPinToggle.row);
    panel.appendChild(disarmPinToggle.row);
    armPinToggle.input.addEventListener("change", savePinOptions);
    disarmPinToggle.input.addEventListener("change", savePinOptions);

    var visible = alarmVisibleActions(b);
    var actionStack = document.createElement("div");
    actionStack.className = "sp-field-stack";
    var actionInputs = {};
    ALARM_ACTIONS.forEach(function (action) {
      var row = helpers.toggleRow(
        action.label,
        helpers.idPrefix + "alarm-action-" + action.value,
        visible.indexOf(action.value) >= 0
      );
      actionInputs[action.value] = row.input;
      actionStack.appendChild(row.row);
      row.input.addEventListener("change", saveActionOptions);
    });
    panel.appendChild(helpers.fieldWithControl("Visible Actions", null, actionStack));

    function saveActionOptions() {
      var selected = [];
      ALARM_ACTIONS.forEach(function (action) {
        if (actionInputs[action.value] && actionInputs[action.value].checked) {
          selected.push(action.value);
        }
      });
      if (!selected.length) {
        selected = alarmActionValues();
        ALARM_ACTIONS.forEach(function (action) {
          if (actionInputs[action.value]) actionInputs[action.value].checked = true;
        });
      }
      setAlarmVisibleActions(b, selected);
      helpers.saveField("options", b.options);
      scheduleRender();
    }

    appendEditAlarmPageButton(panel, slot);
  },
  renderPreview: function (b, helpers) {
    var label = (b.label && b.label.trim()) || (b.entity && b.entity.trim()) || "Alarm";
    var iconName = alarmUsesDefaultIcon(b.icon) ? "security" : iconSlug(b.icon);
    return {
      iconHtml: '<span class="sp-btn-icon mdi mdi-' + iconName + '"></span>',
      labelHtml:
        '<span class="sp-btn-label-row"><span class="sp-btn-label">' +
        helpers.escHtml(label) + '</span><span class="sp-subpage-badge mdi mdi-chevron-right"></span></span>',
    };
  },
  afterSave: function (b, slot, helpers) {
    if (helpers && helpers.isSub) return;
    syncAlarmActionSubpage(slot, b);
  },
  contextMenuItems: function (slot, b, helpers) {
    helpers.addCtxItem("cog", "Edit Alarm Page", function () {
      syncAlarmActionSubpage(slot, b);
      enterSubpage(slot);
    });
  },
});

registerButtonType("alarm_action", {
  label: "Alarm Action",
  allowInSubpage: true,
  isAvailable: function (ctx) { return !!(ctx && ctx.isSub); },
  labelPlaceholder: "e.g. Arm Away",
  onSelect: function (b) {
    var info = ALARM_ACTIONS[0];
    b.entity = "";
    b.label = info.label;
    b.sensor = info.value;
    b.unit = "";
    b.icon = info.icon;
    b.icon_on = "Auto";
    b.precision = "";
    b.options = "";
  },
  renderSettingsBeforeLabel: function (panel, b, slot, helpers) {
    b.sensor = alarmActionInfo(b.sensor) ? b.sensor : "away";
    renderAlarmCardTypeField(panel, b, helpers);
  },
  renderSettings: function (panel, b, slot, helpers) {
    b.sensor = alarmActionInfo(b.sensor) ? b.sensor : "away";
    b.unit = "";
    b.precision = "";
    b.icon_on = "Auto";
    b.options = normalizeAlarmOptions(b.options);

    var entityField = helpers.entityField(
      "Alarm Entity",
      helpers.idPrefix + "alarm-action-entity",
      b.entity,
      "e.g. alarm_control_panel.house",
      ["alarm_control_panel"],
      "entity",
      true,
      "Add an alarm_control_panel entity before saving."
    );
    panel.appendChild(entityField.field);

    panel.appendChild(helpers.iconPickerField(
      helpers.idPrefix + "alarm-action-icon-picker", helpers.idPrefix + "alarm-action-icon",
      b.icon || alarmActionInfo(b.sensor).icon, function (opt) {
        b.icon = opt || alarmActionInfo(b.sensor).icon;
        helpers.saveField("icon", b.icon);
      }, "Icon"
    ));

    var pinMode = b.sensor === "disarm" ? "disarm" : "arm";
    var pinToggle = helpers.toggleRow(
      "PIN required",
      helpers.idPrefix + "alarm-action-pin",
      alarmPinRequired(b, pinMode)
    );
    panel.appendChild(pinToggle.row);
    pinToggle.input.addEventListener("change", function () {
      setAlarmPinRequired(b, pinMode, this.checked);
      helpers.saveField("options", b.options);
    });
  },
  renderPreview: function (b, helpers) {
    var info = alarmActionInfo(b.sensor) || ALARM_ACTIONS[0];
    var label = b.label || info.label;
    var iconName = iconSlug(b.icon || info.icon);
    return {
      iconHtml: '<span class="sp-btn-icon mdi mdi-' + iconName + '"></span>',
      labelHtml: '<span class="sp-btn-label">' + helpers.escHtml(label) + '</span>',
    };
  },
});

function appendEditAlarmPageButton(panel, slot) {
  var configBtn = document.createElement("button");
  configBtn.className = "sp-action-btn sp-edit-subpage-btn";
  configBtn.textContent = "Edit Alarm Page";
  configBtn.addEventListener("click", function () {
    var alarm = state.buttons[slot - 1];
    syncAlarmActionSubpage(slot, alarm);
    closeSettings();
    enterSubpage(slot);
  });
  panel.appendChild(configBtn);
}
