// Read-only presence card: shows a sensor where Detected is active and Clear is inactive.
var PRESENCE_CARD_METADATA = {
  entity: {
    label: "Sensor Entity",
    idSuffix: "sensor",
    placeholder: "e.g. binary_sensor.living_room_presence",
    domains: function () { return cardContractDomains("presence"); },
    bindName: "sensor",
    rerender: true,
    requiredMessage: "Add a presence sensor before saving.",
  },
  labelField: {
    label: "Label",
    idSuffix: "label",
    field: "label",
    placeholder: "e.g. Living Room",
    rerender: true,
  },
  iconOff: {
    pickerIdSuffix: "clear-icon-picker",
    idSuffix: "icon",
    field: "icon",
    label: "Clear Icon",
    fallback: "Motion Sensor Off",
  },
  iconOn: {
    pickerIdSuffix: "detected-icon-picker",
    idSuffix: "icon-on",
    field: "icon_on",
    label: "Detected Icon",
    fallback: "Motion Sensor",
  },
  activeColor: {
    label: "Lit When Detected",
    idSuffix: "presence-active-color",
    checked: presenceActiveColorEnabled,
  },
};

registerButtonType("presence", {
  label: function () { return cardContractCardLabel("presence"); },
  allowInSubpage: function () { return cardContractAllowInSubpage("presence"); },
  pickerKey: function () { return cardContractPickerKey("presence"); },
  experimental: function () { return cardContractExperimental("presence"); },
  hidden: function () { return cardContractHidden("presence"); },
  hideLabel: true,
  defaultConfig: function () { return cardContractDefaultConfig("presence"); },
  cardMetadata: PRESENCE_CARD_METADATA,
  onSelect: function (b) {
    b.entity = "";
    b.sensor = "";
    b.unit = "";
    b.precision = "";
    b.icon = "Motion Sensor Off";
    b.icon_on = "Motion Sensor";
    b.options = setConfigOption("", SENSOR_ACTIVE_COLOR_OPTION, true);
  },
  renderSettings: function (panel, b, slot, helpers) {
    b.entity = "";
    b.unit = "";
    b.precision = "";
    b.options = normalizePresenceOptions(b.options);
    if (!b.icon || b.icon === "Auto") b.icon = "Motion Sensor Off";
    if (!b.icon_on || b.icon_on === "Auto") b.icon_on = "Motion Sensor";

    helpers.renderCardEntityField(panel, b, helpers, PRESENCE_CARD_METADATA);
    helpers.renderCardTextField(panel, b, helpers, PRESENCE_CARD_METADATA.labelField);
    helpers.renderCardIconPicker(panel, b, helpers, PRESENCE_CARD_METADATA.iconOff);
    helpers.renderCardIconPicker(panel, b, helpers, PRESENCE_CARD_METADATA.iconOn);
    helpers.renderCardOptionToggle(panel, b, helpers, Object.assign({}, PRESENCE_CARD_METADATA.activeColor, {
      onChange: function (button, cardHelpers, checked) {
        setPresenceActiveColorEnabled(button, checked);
        cardHelpers.saveField("options", button.options);
      },
    }));
  },
  renderPreview: function (b, helpers) {
    var icon = b.icon && b.icon !== "Auto" ? b.icon : "Motion Sensor Off";
    var label = b.label || b.sensor || "Presence";
    return {
      iconHtml: '<span class="sp-btn-icon mdi mdi-' + iconSlug(icon) + '"></span>',
      labelHtml: cardBadgeLabelHtml(helpers, label, "motion-sensor"),
    };
  },
});
