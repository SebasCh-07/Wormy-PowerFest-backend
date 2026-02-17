# 📤 Guía: Reenviar QR desde el Frontend

## Endpoint de Reenvío

```
POST http://localhost:3003/api/registrations/:id/resend
```

---

## 🎯 Uso en React/JavaScript

### Opción 1: Con fetch (JavaScript puro)

```javascript
async function reenviarQR(ticketId) {
  try {
    const response = await fetch(`http://localhost:3003/api/registrations/${ticketId}/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ QR reenviado exitosamente por email y WhatsApp');
      console.log('Email enviado:', data.notifications.email.sent);
      console.log('WhatsApp enviado:', data.notifications.whatsapp.sent);
    } else {
      alert('❌ Error al reenviar: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error de conexión');
  }
}

// Usar en un botón
<button onClick={() => reenviarQR('clxxx123456')}>
  Reenviar QR
</button>
```

---

### Opción 2: Con axios

```javascript
import axios from 'axios';

async function reenviarQR(ticketId) {
  try {
    const { data } = await axios.post(
      `http://localhost:3003/api/registrations/${ticketId}/resend`
    );

    if (data.success) {
      alert('✅ QR reenviado exitosamente');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error al reenviar');
  }
}
```

---

### Opción 3: Componente React completo

```jsx
import { useState } from 'react';

function BotonReenviarQR({ ticketId, email, phone }) {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleReenviar = async () => {
    setLoading(true);
    setMensaje('');

    try {
      const response = await fetch(
        `http://localhost:3003/api/registrations/${ticketId}/resend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setMensaje('✅ QR reenviado exitosamente');
        
        // Mostrar detalles
        if (data.notifications.email.sent) {
          console.log('📧 Email enviado a:', email);
        }
        if (data.notifications.whatsapp.sent) {
          console.log('📱 WhatsApp enviado a:', phone);
        }
      } else {
        setMensaje('❌ ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje('❌ Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleReenviar} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '⏳ Reenviando...' : '📤 Reenviar QR'}
      </button>
      
      {mensaje && (
        <p style={{ marginTop: '10px', color: mensaje.includes('✅') ? 'green' : 'red' }}>
          {mensaje}
        </p>
      )}
    </div>
  );
}

// Uso:
<BotonReenviarQR 
  ticketId="clxxx123456" 
  email="usuario@example.com"
  phone="0987654321"
/>
```

---

## 📋 Respuesta del Backend

### Éxito (200)
```json
{
  "success": true,
  "message": "QR reenviado exitosamente",
  "notifications": {
    "email": {
      "sent": true,
      "messageId": "abc123"
    },
    "whatsapp": {
      "sent": true,
      "messageId": "xyz789"
    }
  }
}
```

### Error - Registro no encontrado (404)
```json
{
  "success": false,
  "error": "Registro no encontrado"
}
```

### Error - Servidor (500)
```json
{
  "success": false,
  "error": "Error al reenviar QR"
}
```

---

## 💡 Ejemplo de uso en una tabla de registros

```jsx
function TablaRegistros({ registros }) {
  const reenviarQR = async (id) => {
    const confirmacion = confirm('¿Reenviar QR por email y WhatsApp?');
    if (!confirmacion) return;

    try {
      const response = await fetch(
        `http://localhost:3003/api/registrations/${id}/resend`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ QR reenviado exitosamente');
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      alert('❌ Error de conexión');
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {registros.map(registro => (
          <tr key={registro.id}>
            <td>{registro.firstName} {registro.lastName}</td>
            <td>{registro.email}</td>
            <td>{registro.phone}</td>
            <td>
              <button onClick={() => reenviarQR(registro.id)}>
                📤 Reenviar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## ⚠️ Notas importantes

1. **No requiere body:** El endpoint solo necesita el ID en la URL
2. **Reenvía a ambos:** Siempre envía por email Y WhatsApp
3. **Usa los datos actuales:** Toma el email y teléfono que están en la base de datos
4. **Genera QR nuevo:** Crea un QR fresco con el mismo ID

---

## 🧪 Probar con cURL

```bash
curl -X POST http://localhost:3003/api/registrations/clxxx123456/resend
```

---

¡Listo! Con esto tu frontend puede reenviar el QR fácilmente.
