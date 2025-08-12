import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'

export interface ProgramBlock {
  section?: string
  exercises: Array<{
    name: string
    sets?: string | number
    reps?: string | number
    rest?: string
    notes?: string
  }>
}

export interface ProgramPayload {
  title: string
  client_name?: string
  client_email?: string
  notes?: string
  blocks: ProgramBlock[]
  // logoDataUrl?: string  // not used
}

export async function makeProgramPdf(data: ProgramPayload): Promise<Blob> {
  // dynamically import pdfmake only when needed
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])

  // bind fonts (pdfmake ships Roboto in vfs_fonts)
  const pm: any = pdfMake as any
  const pf: any = pdfFonts as any
  if (!pm.vfs) {
    pm.vfs = pf?.pdfMake?.vfs ?? pf?.vfs
  }
  
  const today = new Date().toLocaleDateString()

  // Left-aligned header (no logo)
  const header: Content = {
    stack: [
      { text: data.title || 'Training Program', style: 'h1' },
      { text: `Client: ${data.client_name || '-'}`, style: 'meta' },
      { text: `Date: ${today}`, style: 'meta' },
    ],
    alignment: 'left',
    margin: [0, 0, 0, 10],
  }

  const sections: Content[] = []

  for (const block of data.blocks) {
    if (block.section) {
      sections.push({ text: block.section, style: 'h2', margin: [0, 12, 0, 6] })
    }

    const headerRow: TableCell[] = [
      { text: 'Exercise', style: 'th' },
      { text: 'Sets', style: 'th' },
      { text: 'Reps', style: 'th' },
      { text: 'Rest', style: 'th' },
      { text: 'Notes', style: 'th' },
    ]

    const body: TableCell[][] = [headerRow]
    for (const ex of block.exercises) {
      body.push([
        { text: ex.name || '', style: 'td' },
        { text: ex.sets != null ? String(ex.sets) : '', style: 'tdCenter' },
        { text: ex.reps != null ? String(ex.reps) : '', style: 'tdCenter' },
        { text: ex.rest || '', style: 'tdCenter' },
        { text: ex.notes || '', style: 'td' },
      ])
    }

    sections.push({
      table: {
        widths: ['*', 'auto', 'auto', 'auto', '*'],
        body,
      },
      layout: {
        fillColor: (rowIndex: number) =>
          rowIndex === 0 ? '#111827' : rowIndex % 2 === 0 ? '#0B0F19' : undefined,
        hLineColor: () => '#1F2937',
        vLineColor: () => '#1F2937',
        paddingTop: () => 6,
        paddingBottom: () => 6,
        paddingLeft: () => 6,
        paddingRight: () => 6,
      },
    })
  }

  if (data.notes) {
    sections.push({ text: 'Notes', style: 'h2', margin: [0, 14, 0, 4] })
    sections.push({ text: data.notes, style: 'notes' })
  }

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [32, 40, 32, 50],
    defaultStyle: { fontSize: 10, color: '#E5E7EB' },
    // No images block at all (no logo)
    content: [
      header,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1F2937' }] },
      { text: ' ', margin: [0, 6, 0, 0] },
      ...sections,
    ],
    styles: {
      h1: { fontSize: 18, bold: true, color: '#FACC15' },
      h2: { fontSize: 12, bold: true, color: '#FACC15' },
      meta: { fontSize: 9, color: '#9CA3AF' },
      th: { bold: true, color: '#F3F4F6', fillColor: '#111827' },
      td: {},
      tdCenter: { alignment: 'center' },
      notes: { fontSize: 10, color: '#E5E7EB' },
    },
    background: () => ({
      canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: '#0F1115' }],
    }),
    footer: (current, total) => ({
      columns: [
        { text: 'BRILS GYM', color: '#9CA3AF' },
        { text: `${current} / ${total}`, alignment: 'right', color: '#9CA3AF' },
      ],
      margin: [32, 8, 32, 8],
    }),
  }

  return new Promise<Blob>((resolve) => {
    pdfMake.createPdf(docDef).getBlob((blob: Blob) => resolve(blob))
  })
}
