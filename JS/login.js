import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

// Función para validar que el correo sea institucional de CERTUS
function esCorreoCertus(correo) {
  return correo.toLowerCase().endsWith("@certus.edu.pe");
}

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
  // 3. INICIAR SESIÓN CON FIREBASE (SOLO @certus.edu.pe)
  // =========================================================
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correo = inputCorreo.value.trim().toLowerCase();
    const contrasenia = inputContrasenia.value.trim();
    const recordar = checkRecordar.checked;

    // Validación estricta de dominio institucional
    if (!esCorreoCertus(correo)) {
      mensajeLogin.style.color = "#d9534f";
      mensajeLogin.textContent = "Acceso denegado: Solo se permiten correos @certus.edu.pe";
      return;
    }

    mensajeLogin.style.color = "#555";
    mensajeLogin.textContent = "Verificando credenciales...";

    try {
      // Configurar si la sesión queda guardada o solo mientras esté abierta la pestaña
      await setPersistence(
        auth,
        recordar ? browserLocalPersistence : browserSessionPersistence
      );

      // Iniciar sesión en Firebase Authentication
      const credencial = await signInWithEmailAndPassword(auth, correo, contrasenia);
      const user = credencial.user;

      // Guardamos los datos en el formato que ya usan tus páginas de administrador
      const sesionUsuario = JSON.stringify({
        id: user.uid,
        nombre: user.displayName || "Administrador CERTUS",
        correo: user.email,
        dni: "",
        rol: "administrador",
        categoria: "administrador",
        token: await user.getIdToken()
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

    } catch (error) {
      console.error("Error de autenticación:", error.code);
      mensajeLogin.style.color = "#d9534f";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        mensajeLogin.textContent = "Correo o contraseña incorrectos.";
      } else if (error.code === "auth/too-many-requests") {
        mensajeLogin.textContent = "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.";
      } else {
        mensajeLogin.textContent = "Error al iniciar sesión. Verifica tu conexión e inténtalo otra vez.";
      }
    }
  });

  // =========================================================
  // 4. ENVIAR CORREO DE CAMBIO DE CONTRASEÑA CON FIREBASE
  // =========================================================
  formRecuperar.addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = inputCorreoRecuperar.value.trim().toLowerCase();

    if (!esCorreoCertus(correo)) {
      mensajeRecuperar.style.color = "#d9534f";
      mensajeRecuperar.textContent = "Solo puedes recuperar cuentas institucionales @certus.edu.pe";
      return;
    }

    mensajeRecuperar.style.color = "#555";
    mensajeRecuperar.textContent = "Enviando enlace de recuperación...";

    try {
      await sendPasswordResetEmail(auth, correo);
      mensajeRecuperar.style.color = "#28a745";
      mensajeRecuperar.textContent = "Enlace enviado. Revisa tu bandeja de entrada o spam para cambiar tu clave.";
      formRecuperar.reset();
    } catch (error) {
      console.error("Error de Firebase:", error.code);
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