(function (root) {
  "use strict";

  const PRODUCTION_PART_KIND_ORDER = Object.freeze({
    frame: 1,
    sash: 2,
    mullion: 3
  });

  function defaultPartKind(group) {
    return String(group?.partKind || "").trim().toLowerCase();
  }

  function groupDisplayName(group) {
    return String(group?.name || group?.title || group?.profileCode || "").trim();
  }

  function compareProductionProfileGroups(a, b, partKindForGroup = defaultPartKind) {
    const kindA = String(partKindForGroup(a) || "").trim().toLowerCase();
    const kindB = String(partKindForGroup(b) || "").trim().toLowerCase();
    const priorityA = PRODUCTION_PART_KIND_ORDER[kindA] || Number.MAX_SAFE_INTEGER;
    const priorityB = PRODUCTION_PART_KIND_ORDER[kindB] || Number.MAX_SAFE_INTEGER;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return groupDisplayName(a).localeCompare(groupDisplayName(b), "ru", { sensitivity: "base" });
  }

  function sortProductionProfileGroups(groups, partKindForGroup = defaultPartKind) {
    return (groups || [])
      .map((group, index) => ({ group, index }))
      .sort((a, b) => (
        compareProductionProfileGroups(a.group, b.group, partKindForGroup) || a.index - b.index
      ))
      .map(({ group }) => group);
  }

  root.ProductionOrder = Object.freeze({
    PRODUCTION_PART_KIND_ORDER,
    compareProductionProfileGroups,
    sortProductionProfileGroups
  });
})(typeof window !== "undefined" ? window : globalThis);
