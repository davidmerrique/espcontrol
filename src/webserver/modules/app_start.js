// ── Start ──────────────────────────────────────────────────────────────

function parseDeviceProfileState(data) {
  var value = data && (data.state != null ? data.state : data.value);
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function loadDeviceProfileBeforeStart() {
  return getJsonFirst(entityDetailPaths("text_sensor", entityLookupNames("device_profile")), function (data) {
    var profile = parseDeviceProfileState(data);
    if (profile) applyDeviceProfile(profile);
  }).catch(function () {
    return null;
  });
}

function startAfterDeviceProfile() {
  loadDeviceProfileBeforeStart().then(init, init);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAfterDeviceProfile);
} else {
  startAfterDeviceProfile();
}
