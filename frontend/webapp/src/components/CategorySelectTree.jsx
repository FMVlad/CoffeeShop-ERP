import React from 'react';

export default function CategorySelectTree({
  categories,
  value,
  onChange,
  className,
  style,
  includeAllOption = true,
  allLabel = 'Всі категорії',
}) {
  const flat = React.useMemo(() => {
    const result = [];
    const children = new Map();
    (categories || []).forEach((c) => {
      const pid = c.ParentID == null ? null : c.ParentID;
      if (!children.has(pid)) children.set(pid, []);
      children.get(pid).push(c);
    });
    for (const arr of children.values()) {
      arr.sort((a, b) => String(a.CategoryName || a.Name || '')
        .localeCompare(String(b.CategoryName || b.Name || '')));
    }
    const walk = (pid, level) => {
      (children.get(pid) || []).forEach((c) => {
        result.push({ ...c, _level: level });
        walk(c.ID, level + 1);
      });
    };
    walk(null, 0);
    if (children.has(0)) children.get(0).forEach((c) => result.push({ ...c, _level: 0 }));
    return result;
  }, [categories]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className || 'category-select'} style={style}>
      {includeAllOption && <option value="">{allLabel}</option>}
      {flat.map((c) => (
        <option key={c.ID} value={c.ID}>{`${'— '.repeat(c._level || 0)}${c._level > 0 ? '▶ ' : ''}${c.CategoryName || c.Name}`}</option>
      ))}
    </select>
  );
}

export function CategorySelectStyles() {
  return (
    <style>{`
      .category-select { padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; width: 100%; }
      .category-select option { padding: 6px 8px; }
    `}</style>
  );
}


