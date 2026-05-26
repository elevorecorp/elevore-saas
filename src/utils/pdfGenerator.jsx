import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Define premium styles
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  borderDecorator: {
    position: 'absolute',
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
    border: '1px solid #e7e5e4',
    pointerEvents: 'none',
  },
  header: {
    backgroundColor: '#0c0a09', // Dark stone / black
    padding: 24,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35,
    borderBottom: '4px solid #d97706', // Premium Gold Accent
  },
  headerLeft: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 7,
    color: '#a8a29e',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerRight: {
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24', // Yellow gold
    letterSpacing: 1,
  },
  date: {
    fontSize: 8,
    color: '#a8a29e',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#78716c',
    letterSpacing: 1,
    marginBottom: 12,
    borderBottom: '1px solid #d97706',
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  detailsContainer: {
    marginBottom: 30,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottom: '1px solid #f5f5f4',
  },
  gridLabel: {
    color: '#78716c',
    fontSize: 9,
  },
  gridValue: {
    color: '#1c1917',
    fontWeight: 'bold',
    fontSize: 9,
  },
  totalContainer: {
    backgroundColor: '#fafaf9',
    padding: 20,
    borderRadius: 6,
    borderLeft: '4px solid #d97706',
    borderRight: '1px solid #e7e5e4',
    borderTop: '1px solid #e7e5e4',
    borderBottom: '1px solid #e7e5e4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#44403c',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#b45309', // Warm amber-gold
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 50,
    right: 50,
    textAlign: 'center',
    borderTop: '1px solid #e7e5e4',
    paddingTop: 20,
    color: '#a8a29e',
    fontSize: 7.5,
  },
  footerText: {
    marginBottom: 4,
    letterSpacing: 0.5,
  }
});

// Bilingual translation dictionary
const i18n = {
  en: {
    title: 'ESTIMATE / QUOTE',
    dateLabel: 'Date',
    clientInfo: 'CLIENT INFORMATION',
    clientName: 'Client Name:',
    clientPhone: 'Contact Phone:',
    clientAddress: 'Service Address:',
    serviceDesc: 'SERVICE DESCRIPTION',
    missionType: 'Mission Type:',
    sqft: 'Estimated Area:',
    beds: 'Bedrooms:',
    baths: 'Bathrooms:',
    totalNet: 'ESTIMATED TOTAL NET:',
    thanks: 'Thank you for choosing Elevore Empire.',
    terms: 'This estimate is valid for 30 days and is subject to on-site physical verification.'
  },
  es: {
    title: 'PRESUPUESTO',
    dateLabel: 'Fecha',
    clientInfo: 'INFORMACIÓN DEL CLIENTE',
    clientName: 'Nombre / Razón Social:',
    clientPhone: 'Teléfono de Contacto:',
    clientAddress: 'Dirección de Servicio:',
    serviceDesc: 'DESCRIPCIÓN DEL SERVICIO',
    missionType: 'Tipo de Misión:',
    sqft: 'Área Total Estimada:',
    beds: 'Habitaciones:',
    baths: 'Baños:',
    totalNet: 'TOTAL ESTIMADO NETO:',
    thanks: 'Gracias por elegir a Elevore Empire.',
    terms: 'Este presupuesto tiene una validez de 30 días y está sujeto a verificación física en sitio.'
  }
};

const servicesMap = {
  en: {
    regular: 'Regular Cleaning',
    deep: 'Deep Cleaning',
    move: 'Move In / Out Cleaning',
    postcon: 'Post-Construction Cleaning',
    airbnb: 'Airbnb / Vacation Rental Turnover'
  },
  es: {
    regular: 'Limpieza Regular',
    deep: 'Limpieza Profunda',
    move: 'Limpieza de Mudanza (In/Out)',
    postcon: 'Limpieza Post-Construcción',
    airbnb: 'Giro de Airbnb / Renta Vacacional'
  }
};

// React PDF Document
const QuoteDocument = ({ quoteData }) => {
  const lang = quoteData.lang === 'es' ? 'es' : 'en';
  const t = i18n[lang];
  const dateStr = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US');
  const serviceName = servicesMap[lang][quoteData.svc] || String(quoteData.svc).toUpperCase();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.borderDecorator} />
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>ELEVORE EMPIRE</Text>
            <Text style={styles.subtitle}>Premium Business Solutions</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{t.title}</Text>
            <Text style={styles.date}>{t.dateLabel}: {dateStr}</Text>
          </View>
        </View>
 
        {/* CLIENT DETAILS */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>{t.clientInfo}</Text>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>{t.clientName}</Text>
            <Text style={styles.gridValue}>{quoteData.name || (lang === 'es' ? 'Cliente Distinguido' : 'Distinguished Client')}</Text>
          </View>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>{t.clientPhone}</Text>
            <Text style={styles.gridValue}>{quoteData.phone || 'N/A'}</Text>
          </View>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>{t.clientAddress}</Text>
            <Text style={styles.gridValue}>{quoteData.address || 'N/A'}</Text>
          </View>
        </View>
 
        {/* QUOTE DETAILS */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>{t.serviceDesc}</Text>
          <View style={styles.gridRow}>
            <Text style={styles.gridLabel}>{t.missionType}</Text>
            <Text style={styles.gridValue}>{serviceName}</Text>
          </View>
          {quoteData.svc === 'postcon' ? (
            <View style={styles.gridRow}>
              <Text style={styles.gridLabel}>{t.sqft}</Text>
              <Text style={styles.gridValue}>{quoteData.sqft} SqFt</Text>
            </View>
          ) : (
            <>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>{t.beds}</Text>
                <Text style={styles.gridValue}>{quoteData.beds}</Text>
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>{t.baths}</Text>
                <Text style={styles.gridValue}>{quoteData.baths}</Text>
              </View>
            </>
          )}
        </View>
 
        {/* TOTAL */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{t.totalNet}</Text>
          <Text style={styles.totalValue}>${quoteData.qp}</Text>
        </View>
 
        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.thanks}</Text>
          <Text style={styles.footerText}>{t.terms}</Text>
        </View>
      </Page>
    </Document>
  );
};

export const generateQuotePDF = async (quoteData) => {
  try {
    const blob = await pdf(<QuoteDocument quoteData={quoteData} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Elevore_Quote_${quoteData.name ? quoteData.name.replace(/\s+/g, '_') : 'Cliente'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating PDF with react-pdf:', error);
  }
};
