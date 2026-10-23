/* CONFIGURACIÓN FÁCIL: cambiá marca/colores y agregá edificios en la lista. */
window.COPELLO_CONFIG = {
  brand: "Copello",
  subtitle: "Administración de consorcios",
  colors: {
    primary: "#3978f6", primaryDark: "#245bd0",
    page: "#f6f7fb", surface: "#ffffff", sidebar: "#ffffff",
    text: "#1d2433", muted: "#737d90", accent: "#e9efff"
  },
  // Ejemplos ilustrativos. Copiá un objeto para agregar otro edificio.
  buildings: [
    { id: "demo-1", name: "Consorcio San Martín", address: "San Martín 000, completar localidad", units: 24, color: "#3978f6", notes: "Edificio de demostración" },
    { id: "demo-2", name: "Consorcio Belgrano", address: "Belgrano 000, completar localidad", units: 18, color: "#20a486", notes: "Edificio de demostración" },
    { id: "demo-3", name: "Consorcio Rivadavia", address: "Rivadavia 000, completar localidad", units: 32, color: "#e5a13a", notes: "Edificio de demostración" }
  ]
};
// No guardes contraseñas, tokens de Gmail ni datos sensibles en este archivo.
