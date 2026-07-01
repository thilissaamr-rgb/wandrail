import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

// Genere et telecharge un billet de train PDF avec QR code.
// Billet de demonstration : la reservation reelle se fait via SNCF Connect.
export async function generateTicket({ origin, destination, departement, priceEur, co2SavedKg, distanceKm }) {
  const ref = 'WDR-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = '08:42'
  const arriveStr = '10:05'
  const voiture = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const place = String(Math.floor(Math.random() * 80) + 1).padStart(2, '0')

  const orig = cap(origin)
  const dest = cap(destination)
  const qrData = `WANDRAIL|${ref}|${orig}->${dest}|${dateStr}|${timeStr}`
  const qr = await QRCode.toDataURL(qrData, { margin: 1, width: 300 })

  const doc = new jsPDF({ unit: 'mm', format: [190, 90], orientation: 'landscape' })
  const V = [124, 58, 237]
  const INK = [17, 17, 17]
  const GREY = [110, 110, 110]

  // Fond
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, 190, 90, 'F')

  // Bandeau haut
  doc.setFillColor(...V)
  doc.rect(0, 0, 190, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('WANDRAIL', 8, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('BILLET DE TRAIN', 182, 11, { align: 'right' })

  // Trajet
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(orig, 8, 34)
  doc.setTextColor(...V)
  doc.text('>', 8 + doc.getTextWidth(orig) + 5, 34)
  doc.setTextColor(...INK)
  doc.text(dest, 8 + doc.getTextWidth(orig) + 14, 34)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GREY)
  doc.text('DEPART', 8, 40)
  doc.text('ARRIVEE', 8 + doc.getTextWidth(orig) + 14, 40)

  // Infos billet (grille)
  const infos = [
    ['Date', dateStr],
    ['Depart', `${timeStr} (${orig})`],
    ['Arrivee', `${arriveStr} (${dest})`],
    ['Train', 'TER Pays de la Loire'],
    ['Voiture / Place', `${voiture} / ${place}`],
    ['Departement', cap(departement || '')],
  ]
  let y = 50
  infos.forEach(([k, v]) => {
    doc.setTextColor(...GREY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(k.toUpperCase(), 8, y)
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(String(v), 45, y)
    y += 6
  })

  // Ligne de perforation avant le talon QR
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([1.2, 1.2], 0)
  doc.line(132, 18, 132, 90)
  doc.setLineDashPattern([], 0)

  // Talon : QR + reference
  doc.addImage(qr, 'PNG', 143, 24, 36, 36)
  doc.setTextColor(...GREY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text('Reference', 161, 65, { align: 'center' })
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(ref, 161, 70, { align: 'center' })

  // Bandeau eco bas
  doc.setFillColor(240, 253, 244)
  doc.rect(0, 79, 132, 11, 'F')
  doc.setTextColor(22, 128, 61)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const eco =
    co2SavedKg != null ? `~${Math.round(co2SavedKg)} kg CO2 economises vs voiture` : 'Voyage bas carbone'
  doc.text(eco, 8, 86)
  if (priceEur != null) {
    doc.setTextColor(...V)
    doc.setFontSize(11)
    doc.text(`${Math.round(priceEur)} EUR`, 128, 86, { align: 'right' })
  }

  doc.save(`billet-wandrail-${dest}.pdf`.toLowerCase().replace(/\s+/g, '-'))
  return ref
}
