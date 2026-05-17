# 📘 GUÍA DE USUARIO: NUEVAS CARACTERÍSTICAS PREMIUM SAAS

¡Tu aplicación ha recibido una actualización maestra! Este documento es tu manual de operaciones para entender y utilizar las 5 nuevas características revolucionarias que acabamos de implementar y desplegar en producción.

---

## 🔑 1. Sistema de Inicio de Sesión por PIN Personalizado
Ya no necesitas contraseñas largas y molestas. Cada usuario y empleado ingresa con un código PIN numérico que determina automáticamente su rol y personaliza su vista al instante:

* **Administrador (Tú):** 
  * **PIN por Defecto:** `2026`
  * **Vista:** Acceso total al panel de control, analíticas financieras, lista de clientes DNA, gestión de membresías, base de fotos antes/después y ledger de pagos del equipo.
* **Equipo Alpha (Ejemplo):** 
  * **PIN por Defecto:** `1122`
  * **Vista:** Panel simplificado de misiones del día, billetera digital de ganancias y acceso al mapa interactivo de rutas.
* **Equipo Beta (Ejemplo):** 
  * **PIN por Defecto:** `3344`
* **Nuevos Empleados:** Puedes añadir cualquier empleado desde el panel de "Team" y asignarle su propio PIN numérico único (ej. `7788`). ¡Cuando lo digite en la pantalla de inicio, la app sabrá exactamente quién es y cargará sus datos!

---

## 🧠 2. Elevore AI Command Center (Asesor de Inteligencia Artificial)
Hemos creado un **Asesor de IA contextualmente inteligente** (haz clic en el botón **🧠 AI Advisor** en la parte superior derecha de tu barra de navegación). A diferencia de las IAs genéricas, esta IA lee las estadísticas de tus clientes y base de misiones reales en tiempo real para darte cálculos y plantillas exactas:

* **📊 Inteligencia Financiera:** Haz clic en "📊 Financiero" o pregúntale *"¿Cómo van mis finanzas?"*. La IA calculará tu MRR actual, tu porcentaje de progreso de metas y te dará ideas comerciales.
* **🚨 Riesgo de Abandono (Churn):** Haz clic en "🚨 Churn". La IA buscará clientes que lleven más de 45 días sin agendar un servicio, te dirá quiénes son y redactará un mensaje de WhatsApp personalizado de recuperación listo para copiar y pegar.
* **💎 Campaña VIP:** Haz clic en "💎 VIP Promo". La IA identificará clientes leales (con 3 o más servicios contratados) que aún no tienen membresía, y generará un mensaje persuasivo para ofrecerles tu plan mensual.
* **🛠️ Manual de Operaciones:** Pregúntale cosas como *"¿Cómo parchar drywall?"* o *"¿Cómo limpiar un horno?"* para obtener guías paso a paso del estándar de calidad de Elevore.

---

## 📍 3. Centro de Mapas Interactivos (Google Maps Integration)
Hemos integrado un mapa satelital interactivo en el dashboard de administración y en el panel de empleados:
* **En el Dashboard de Administración:** Verás el panel "Interactive Project Locations" con un mapa en vivo. Debajo del mapa, verás botones rápidos con los nombres de tus clientes activos. Al hacer clic en cualquiera de ellos, **el mapa se actualizará instantáneamente mostrando la ubicación geográfica de su casa o proyecto**.
* **En la Vista del Empleado:** Cuando inicien una misión, tendrán su propio mapa interactivo para ver la ruta ideal y un botón rápido de "📍 GPS" que abrirá Google Maps con navegación guiada por voz en su celular al instante.

---

## 💰 4. Billetera Digital (Wallet) para Empleados
Cada empleado ahora cuenta con su propia billetera digital dentro de la app para ver su rendimiento:
* **¿Cómo ganan dinero?** Cada vez que completan un proyecto asignado, la app calcula automáticamente su pago según el porcentaje de nómina (ej. **40% de labor split**).
* **⚡ Bono de Velocidad y Calidad:** Si el empleado realiza el Check In y Check Out en menos de 3 horas, y el cliente le otorga una calificación de 4 o 5 estrellas en su portal, **¡la app le otorga automáticamente un bono de $5 dólares extra en su billetera!**
* **💸 Solicitudes de Pago (Cashout):** El empleado puede ver su saldo acumulado impago y hacer clic en **"Zelle Cashout"**. Esto enviará una solicitud al panel del Administrador y lo marcará como pagado una vez que realices la transferencia al número Zelle del negocio.

---

## 👥 5. Consola de Gestión de Personal (Team)
En tu menú inferior, haz clic en la pestaña **Team** (icono de billetera/usuario) para acceder al centro de control del personal:
* **Añadir Empleados:** Registra el nombre, asigna el rol (staff, supervisor, admin) y defínele su PIN de acceso.
* **Ledger de Pagos:** Monitorea en vivo cuánto saldo tiene pendiente cada empleado y cuánto ha ganado históricamente. Desde aquí puedes liberar sus pagos de Zelle con un solo clic.

---

## 🚀 ¡Todo en Vivo y Listo!
Esta actualización ya se encuentra **completamente desplegada en Vercel** en tu enlace oficial:
👉 **[https://elevore-saas.vercel.app](https://elevore-saas.vercel.app)**

Abre tu VS Code o tu panel en la nube para probar estas espectaculares herramientas. ¡Estás a un paso de dominar el sector de servicios con tecnología de punta! 🌟🏠
