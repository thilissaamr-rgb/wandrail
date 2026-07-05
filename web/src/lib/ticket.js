import { jsPDF } from 'jspdf'

const clean = (value) => String(value || '').replace(/[^\x20-\x7EÀ-ÿ]/g, '')

// Génère un récapitulatif de préparation. Ce document n'est ni un billet,
// ni une réservation : l'achat reste volontairement délégué à SNCF Connect.
export async function generateTravelSummary({ origin, destination, departement, priceEur, co2SavedKg, distanceKm, activities = [] }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const GREEN = [10, 92, 54]
  const INK = [20, 28, 24]
  const MUTED = [92, 105, 98]
  const dest = clean(destination)

  doc.setFillColor(...GREEN)
  doc.rect(0, 0, 210, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('WANDRAIL', 18, 16)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('RECAPITULATIF DE VOYAGE - DOCUMENT NON CONTRACTUEL', 18, 25)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(25)
  doc.text(dest, 18, 52)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text(`${clean(departement)} - accessible en train`, 18, 60)

  const metrics = [
    ['Point de comparaison', clean(origin)],
    ['Distance aller-retour', distanceKm != null ? `environ ${Math.round(distanceKm)} km` : 'non calculee'],
    ['Budget train indicatif', priceEur != null ? `environ ${Math.round(priceEur)} EUR` : 'a verifier'],
    ['CO2 evite vs voiture', co2SavedKg != null ? `environ ${Math.round(co2SavedKg)} kg` : 'non calcule'],
  ]
  let y = 78
  metrics.forEach(([label, value]) => {
    doc.setFillColor(245, 249, 247)
    doc.roundedRect(18, y - 7, 174, 14, 3, 3, 'F')
    doc.setTextColor(...MUTED)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(label, 23, y + 1)
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, 187, y + 1, { align: 'right' })
    y += 18
  })

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Mon itineraire', 18, y + 6)
  y += 16
  doc.setFontSize(10)
  if (activities.length) {
    activities.slice(0, 12).forEach((activity, index) => {
      doc.setFillColor(...GREEN)
      doc.circle(22, y - 1, 3, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.text(String(index + 1), 22, y + 1, { align: 'center' })
      doc.setTextColor(...INK)
      doc.setFontSize(10)
      doc.text(clean(activity), 30, y + 1)
      y += 10
    })
  } else {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text('Ajoutez des activites sur la fiche destination pour composer votre journee.', 18, y)
    y += 12
  }

  doc.setDrawColor(220, 226, 222)
  doc.line(18, 265, 192, 265)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Estimations indicatives. Horaires, disponibilites et tarifs a verifier sur SNCF Connect.', 18, 274)
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} par Wandrail.`, 18, 280)

  doc.save(`voyage-wandrail-${dest}.pdf`.toLowerCase().replace(/\s+/g, '-'))
}
