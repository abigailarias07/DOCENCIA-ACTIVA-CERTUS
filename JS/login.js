import { auth } from "./firebase-config.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Cambia esta URL por la ruta real de tu API REST conectada a MySQL
const API_URL_LOGIN = "http://localhost:3000/api/login";

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a las dos tarjetas (secciones)
  const seccionLogin = document.getElementById("seccion-login");
  const seccionRecuperar = document.getElementById("seccion-recuperar");

  // Botones para cambiar de tarjeta
  const btnIrRecuperar = document.getElementById("btn-ir-recuperar");
  const btnVolverLogin = document.getElementById("btn-volver-login");

  // Elementos del formulario de Login
  const formLogin = document.getElementById("form-login");
  const inputCorreo = document.getElementById("correo");
  const inputContrasenia = document.getElementById("contrasenia");
  const checkRecordar = document.getElementById("recordar_contrasenia");
  const mensajeLogin = document.getElementById("mensaje-login");

  // Elementos del formulario de Recuperación
  const formRecuperar = document.getElementById("form-recuperar");
  const inputCorreoRecuperar = document.getElementById("correo-recuperar");
  const mensajeRecuperar = document.getElementById("mensaje-recuperar");

  // =========================================================
  // 1. VERIFICAR SI YA HAY UNA SESIÓN RECORDADA EN LA PC
  // =========================================================
  const sesionGuardada = localStorage.getItem("usuario_certus");
  if (sesionGuardada) {
    try {
      const usuario = JSON.parse(sesionGuardada);
      if (usuario && usuario.rol === "administrador") {
        window.location.href = "index.html";
        return;
      }
    } catch (e) {
      localStorage.removeItem("usuario_certus");
    }
  }

  // =========================================================
  // 2. CAMBIAR ENTRE TARJETA DE LOGIN Y RECUPERAR CONTRASEÑA
  // =========================================================
  btnIrRecuperar.addEventListener("click", (e) => {
    e.preventDefault();
    seccionLogin.hidden = true;
    seccionRecuperar.hidden = false;
    mensajeRecuperar.textContent = "";

    // Si el usuario ya había escrito su correo en el login, lo copiamos automáticamente
    if (inputCorreo.value.trim() !== "") {
      inputCorreoRecuperar.value = inputCorreo.value.trim();
    }
  });

  btnVolverLogin.addEventListener("click", (e) => {
    e.preventDefault();
    seccionRecuperar.hidden = true;
    seccionLogin.hidden = false;
    mensajeLogin.textContent = "";
  });

  // =========================================================
  // 3. INICIAR SESIÓN CON API REST (MYSQL) + USUARIO DE PRUEBA
  // =========================================================
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    mensajeLogin.style.color = "#555";
    mensajeLogin.textContent = "Verificando credenciales...";

    const correo = inputCorreo.value.trim();
    const contrasenia = inputContrasenia.value.trim();
    const recordar = checkRecordar.checked;

    // ---> AQUÍ ESTÁ EL USUARIO ADMINISTRADOR DE PRUEBA <---
    if (correo === "admin@certus.edu.pe" && contrasenia === "123456") {
      const sesionUsuario = JSON.stringify({
        id: 1,
        nombre: "Administrador Prueba CERTUS",
        correo: "admin@certus.edu.pe",
        dni: "12345678",
        rol: "administrador",
        categoria: "administrador",
        token: "token-prueba-local"
      });

      if (recordar) {
        localStorage.setItem("usuario_certus", sesionUsuario);
      } else {
        sessionStorage.setItem("usuario_certus", sesionUsuario);
      }

      mensajeLogin.style.color = "#28a745";
      mensajeLogin.textContent = "¡Bienvenido Administrador! Redirigiendo...";

      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
      return; // Evita que continúe hacia el fetch de MySQL
    }
    // ---> FIN DEL USUARIO DE PRUEBA <---

    try {
      const respuesta = await fetch(API_URL_LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ correo, contrasenia })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        // Verificamos que el usuario sea administrador
        if (datos.usuario.rol !== "administrador") {
          mensajeLogin.style.color = "#d9534f";
          mensajeLogin.textContent = "Acceso denegado: Solo administradores pueden ingresar.";
          return;
        }

        // Preparamos los datos de la sesión
        const sesionUsuario = JSON.stringify({
          id: datos.usuario.id,
          nombre: datos.usuario.nombre,
          correo: datos.usuario.correo,
          dni: datos.usuario.dni || "",
          rol: datos.usuario.rol,
          categoria: datos.usuario.categoria || "",
          token: datos.token || ""
        });

        // Guardamos en localStorage (si marcó recordar) o sessionStorage (si no lo marcó)
        if (recordar) {
          localStorage.setItem("usuario_certus", sesionUsuario);
        } else {
          sessionStorage.setItem("usuario_certus", sesionUsuario);
        }

        mensajeLogin.style.color = "#28a745";
        mensajeLogin.textContent = "¡Bienvenido! Redirigiendo...";

        // Mandamos al administrador al index.html
        setTimeout(() => {
          window.location.href = "index.html";
        }, 800);

      } else {
        mensajeLogin.style.color = "#d9534f";
        mensajeLogin.textContent = datos.mensaje || "Correo o clave de acceso incorrectos.";
      }

    } catch (error) {
      console.error("Error de conexión con la API:", error);
      mensajeLogin.style.color = "#d9534f";
      mensajeLogin.textContent = "Error al conectar con el servidor. Usa admin@certus.edu.pe / 123456 para prueba.";
    }
  });

  // =========================================================
  // 4. ENVIAR CORREO DE CAMBIO DE CONTRASEÑA CON FIREBASE
  // =========================================================
  formRecuperar.addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = inputCorreoRecuperar.value.trim();

    mensajeRecuperar.style.color = "#555";
    mensajeRecuperar.textContent = "Enviando enlace de recuperación...";

    try {
      await sendPasswordResetEmail(auth, correo);
      mensajeRecuperar.style.color = "#28a745";
      mensajeRecuperar.textContent = "Enlace enviado. Revisa tu bandeja de entrada o spam para cambiar tu clave.";
      formRecuperar.reset();
    } catch (error) {
      console.error("Error de Firebase:", error.code, error.message);
      mensajeRecuperar.style.color = "#d9534f";

      if (error.code === "auth/user-not-found") {
        mensajeRecuperar.textContent = "No existe ninguna cuenta registrada con ese correo.";
      } else if (error.code === "auth/invalid-email") {
        mensajeRecuperar.textContent = "El formato del correo electrónico no es válido.";
      } else {
        mensajeRecuperar.textContent = "No se pudo enviar el correo. Inténtalo nuevamente.";
      }
    }
  });
});