// Shared "professional Excel export" styling — bold white-on-navy header row,
// frozen header row, and an autofilter on the header. Extracted here since the
// free-tier `xlsx` package (used elsewhere in the app) can't write any of this;
// exceljs is the only export path that goes through these helpers.
export function styleHeaderRow(ws) {
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2545' } };
    cell.alignment = { vertical: 'middle' };
  });
  headerRow.height = 20;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const colCount = ws.columns?.length || ws.columnCount;
  if (colCount) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colCount } };
  }
}

export async function downloadWorkbook(wb, filename) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
