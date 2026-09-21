import { GROUP_FILL_ARGB, GROUP_FONT_ARGB } from './tableGroups';

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

// Same column-group color bands the İllik TNA and İzləmə tables show on
// screen (see lib/tableGroups.js), applied to the exported header row instead
// of the flat navy styleHeaderRow uses, plus a full grid of borders over the
// header and every data cell so the downloaded file keeps the same
// bold-outlined, color-coded look as the on-screen table.
// `columnGroups` is an array of group keys, one per ws.columns entry in order.
export function styleGroupedTable(ws, columnGroups) {
  const gridLine = { style: 'thin', color: { argb: 'FFCBD5E1' } };
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = { top: gridLine, left: gridLine, right: gridLine, bottom: gridLine };
    });
  });

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const g = columnGroups[colNumber - 1] || 'meta';
    cell.font = { bold: true, color: { argb: GROUP_FONT_ARGB[g] } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GROUP_FILL_ARGB[g] } };
    cell.alignment = { vertical: 'middle' };
    cell.border = { ...cell.border, bottom: { style: 'medium', color: { argb: GROUP_FONT_ARGB[g] } } };
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
