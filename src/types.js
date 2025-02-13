function parseTimestamp(timestamp) {
  // Postgres format 2001-01-01 00:00:00 or 2001-01-01 00:00:00.123456
  // Postgres format +292278994-08-16 23:00:00 or -292275055-05-16 23:00:00 for Infinity values
  // eslint-disable-next-line no-case-declarations
  const [, year, month, day, hour, minute, second, millisecond = ''] = timestamp.match(
    /^([+|-]?\d+)-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}):(\d{1,2})(?:.(\d{1,3}))?(?:\d{1,3})?$/,
  );

  // Data Api may return timestamps out of range of JS max timestamp value of +-8640000000000000
  // Year comparison is performed first and if the year is in range, then ISO date strings may be compared
  const yearNumber = Number(year);
  if (yearNumber > 275760) {
    return Infinity;
  }
  if (yearNumber < -271821) {
    return -Infinity;
  }

  return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond.padEnd(3, 0)));
}

function applyRecord(columnMetadata, record) {
  const parsedColumns = {};

  columnMetadata.forEach((column) => {
    // Skip null values
    if (record[column.name]) {
      switch (column.typeName) {
        case 'timestamp':
        case 'timestamptz':
          parsedColumns[column.name] = parseTimestamp(record[column.name]);
          break;
        case 'json':
        case 'jsonb':
          parsedColumns[column.name] = JSON.parse(record[column.name]);
          break;
        case '_text':
          parsedColumns[column.name] = record[column.name].stringValues;
          break;
        default:
          // Skip
          break;
      }
    }
  });

  return {
    ...record,
    ...parsedColumns,
  };
}

function apply({ columnMetadata, records }) {
  return records.map((record) => applyRecord(columnMetadata, record));
}

module.exports = {
  apply,
};
