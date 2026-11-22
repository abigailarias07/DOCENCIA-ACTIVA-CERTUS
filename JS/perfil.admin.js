import { auth } from "./firebase-config.js";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// URL de tu API REST para perfil, foto y cambio de clave en MySQL
const API_URL_ADMIN = "http://localhost:3000/api/usuarios";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1. VERIFICAR SESIÓN ACTIVA DEL ADMINISTRADOR
  // =========================================================
  const sesionRaw = localStorage.getItem("usuario_certus") || sessionStorage.getItem("usuario_certus");
  if (!sesionRaw) {
    window.location.href = "login.html";
    return;
  }

  const usuarioSesion = JSON.parse(sesionRaw);

  // Referencias del DOM
  const txtNombre = document.getElementById("admin-nombre");
  const txtCorreo = document.getElementById("admin-correo");
  const txtDni = document.getElementById("admin-dni");
  const imgFoto = document.getElementById("admin-foto");
  const inputFotoAdmin = document.getElementById("input-foto-admin");
  const btnCambiarFoto = document.getElementById("btn-cambiar-foto");

  const modalClave = document.getElementById("modal-clave-admin");
  const btnEditarClave = document.getElementById("btn-editar-clave");
  const btnCerrarClave = document.getElementById("btn-cerrar-clave");
  const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
  const formCambiarClave = document.getElementById("form-cambiar-clave");
  const mensajeClave = document.getElementById("mensaje-clave");

  // =========================================================
  // 2. MOSTRAR DATOS DEL ADMINISTRADOR (SESIÓN + MYSQL)
  // =========================================================
  txtNombre.textContent = usuarioSesion.nombre || "Administrador Certus";
  txtCorreo.textContent = usuarioSesion.correo || "";
  if (usuarioSesion.dni) {
    txtDni.textContent = `DNI: ${usuarioSesion.dni}`;
  }
  if (usuarioSesion.foto && imgFoto) {
    imgFoto.src = usuarioSesion.foto;
  }

  // Consultamos a MySQL para traer los datos completos actualizados (como DNI o foto)
  try {
    const respuesta = await fetch(`${API_URL_ADMIN}/${usuarioSesion.id}`);
    const datos = await respuesta.json();

    if (respuesta.ok && datos.exito) {
      txtNombre.textContent = datos.usuario.nombre;
      txtCorreo.textContent = datos.usuario.correo;
      txtDni.textContent = `DNI: ${datos.usuario.dni || "No registrado"}`;
      if (datos.usuario.foto && imgFoto) {
        imgFoto.src = datos.usuario.foto;
      }
    }
  } catch (error) {
    console.warn("No se pudo sincronizar datos extra con MySQL, usando datos de sesión.", error);
  }

  // =========================================================
  // 3. CAMBIAR FOTO DE PERFIL DESDE EL COMPUTADOR (ESTILO IG)
  // =========================================================
  const abrirSelectorFoto = () => inputFotoAdmin && inputFotoAdmin.click();

  if (imgFoto) imgFoto.addEventListener("click", abrirSelectorFoto);
  if (btnCambiarFoto) btnCambiarFoto.addEventListener("click", abrirSelectorFoto);

  if (inputFotoAdmin) {
    inputFotoAdmin.addEventListener("change", async (e) => {
      const archivo = e.target.files[0];
      if (!archivo) return;

      // Validar que sea una imagen
      if (!archivo.type.startsWith("image/")) {
        alert("Por favor selecciona un archivo de imagen válido (JPG, PNG, etc.).");
        return;
      }

      // Vista previa instantánea en pantalla
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fotoBase64 = ev.target.result;
        imgFoto.src = fotoBase64;

        // Guardamos también en la sesión local para que persista al recargar mientras no haya backend
        usuarioSesion.foto = fotoBase64;
        if (localStorage.getItem("usuario_certus")) {
          localStorage.setItem("usuario_certus", JSON.stringify(usuarioSesion));
        } else {
          sessionStorage.setItem("usuario_certus", JSON.stringify(usuarioSesion));
        }
      };
      reader.readAsDataURL(archivo);

      // Enviar la foto al servidor MySQL (API REST)
      const formData = new FormData();
      formData.append("foto", archivo);

      try {
        const respuesta = await fetch(`${API_URL_ADMIN}/${usuarioSesion.id}/foto`, {
          method: "PUT",
          body: formData
        });
        const datos = await respuesta.json();
        if (respuesta.ok && datos.exito && datos.fotoUrl) {
          imgFoto.src = datos.fotoUrl;
        }
      } catch (error) {
        console.warn("Foto actualizada en vista local (servidor MySQL aún apagado).");
      }
    });
  }

  // =========================================================
  // 4. CONTROL DEL MODAL DE CONTRASEÑA
  // =========================================================
  btnEditarClave.addEventListener("click", () => {
    formCambiarClave.reset();
    mensajeClave.textContent = "";
    modalClave.showModal();
  });

  btnCerrarClave.addEventListener("click", () => {
    modalClave.close();
  });

  // =========================================================
  // 5. ACTUALIZAR CONTRASEÑA EN FIREBASE Y MYSQL
  // =========================================================
  formCambiarClave.addEventListener("submit", async (e) => {
    e.preventDefault();

    const claveActual = document.getElementById("clave-actual").value;
    const claveNueva = document.getElementById("clave-nueva").value;
    const claveConfirmar = document.getElementById("clave-confirmar").value;

    if (claveNueva !== claveConfirmar) {
      mensajeClave.style.color = "#d9534f";
      mensajeClave.textContent = "La nueva contraseña y su confirmación no coinciden.";
      return;
    }

    if (claveActual === claveNueva) {
      mensajeClave.style.color = "#d9534f";
      mensajeClave.textContent = "La nueva contraseña debe ser diferente a la actual.";
      return;
    }

    mensajeClave.style.color = "#555";
    mensajeClave.textContent = "Actualizando contraseña...";

    try {
      const userFirebase = auth.currentUser;
      if (userFirebase) {
        const credencial = EmailAuthProvider.credential(userFirebase.email, claveActual);
        await reauthenticateWithCredential(userFirebase, credencial);
        await updatePassword(userFirebase, claveNueva);
      }

      const respuesta = await fetch(`${API_URL_ADMIN}/${usuarioSesion.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          claveActual,
          claveNueva
        })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        mensajeClave.style.color = "#28a745";
        mensajeClave.textContent = "¡Contraseña actualizada correctamente!";
        setTimeout(() => {
          modalClave.close();
          formCambiarClave.reset();
        }, 1200);
      } else {
        mensajeClave.style.color = "#d9534f";
        mensajeClave.textContent = datos.mensaje || "La contraseña actual es incorrecta.";
      }

    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      mensajeClave.style.color = "#d9534f";
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        mensajeClave.textContent = "La contraseña actual no es correcta.";
      } else {
        mensajeClave.textContent = "No se pudo actualizar la contraseña. Verifica tu conexión.";
      }
    }
  });

  // =========================================================
  // 6. CERRAR SESIÓN (BORRA LA SESIÓN GUARDADA EN LA PC)
  // =========================================================
  btnCerrarSesion.addEventListener("click", () => {
    localStorage.removeItem("usuario_certus");
    sessionStorage.removeItem("usuario_certus");
    window.location.href = "login.html";
  });
});