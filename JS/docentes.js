import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// URL de tu API REST para gestionar docentes en MySQL
const API_URL_DOCENTES = "http://localhost:3000/api/docentes";

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1. PROTECCIÓN DE RUTA (SOLO ADMINISTRADORES LOGUEADOS)
  // =========================================================
  const sesion = localStorage.getItem("usuario_certus") || sessionStorage.getItem("usuario_certus");
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  // Referencias del DOM
  const modal = document.getElementById("modal-crear-docente");
  const btnNuevoDocente = document.getElementById("btn-nuevo-docente");
  const btnCerrarModal = document.getElementById("btn-cerrar-modal");
  const formNuevoDocente = document.getElementById("form-nuevo-docente");
  const inputPassword = document.getElementById("password-docente");
  const inputBuscador = document.querySelector('#header-lista input[type="search"]');
  const contenedorDocentes = document.getElementById("contenedor-tarjetas-docentes") || document.getElementById("lista-docentes");

  // Docentes de prueba mientras conectas tu base de datos MySQL
  let listaDocentesGlobal = [
    { id: 1, nombre: "María Gómez", correo: "mgomez@certus.edu.pe", dni: "71234567" },
    { id: 2, nombre: "Carlos Ruiz", correo: "cruiz@certus.edu.pe", dni: "76543210" }
  ];

  // =========================================================
  // 2. GENERADOR DE CONTRASEÑA ALEATORIA SEGURA
  // =========================================================
  function generarContraseniaAleatoria(longitud = 10) {
    const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%";
    let password = "";
    for (let i = 0; i < longitud; i++) {
      const indice = Math.floor(Math.random() * caracteres.length);
      password += caracteres.charAt(indice);
    }
    return password;
  }

  // =========================================================
  // 3. CONTROL DEL MODAL (+ Y X)
  // =========================================================
  btnNuevoDocente.addEventListener("click", () => {
    formNuevoDocente.reset();
    // Generamos la contraseña aleatoria automáticamente al abrir el modal
    const claveGenerada = generarContraseniaAleatoria(10);
    inputPassword.type = "text"; // Lo ponemos visible para que el admin pueda ver/copiar la clave generada
    inputPassword.value = claveGenerada;
    modal.showModal();
  });

  btnCerrarModal.addEventListener("click", () => {
    modal.close();
  });

  // =========================================================
  // 4. CARGAR DOCENTES DESDE MYSQL (API REST - GET)
  // =========================================================
  async function cargarDocentes() {
    try {
      const respuesta = await fetch(API_URL_DOCENTES);
      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        listaDocentesGlobal = datos.docentes;
        renderizarDocentes(listaDocentesGlobal);
      } else {
        console.error("Error al obtener docentes:", datos.mensaje);
        renderizarDocentes(listaDocentesGlobal);
      }
    } catch (error) {
      console.warn("Servidor MySQL aún apagado, mostrando docentes de prueba.");
      renderizarDocentes(listaDocentesGlobal);
    }
  }

  // Función para dibujar cada tarjeta <article class="docencia">
  function renderizarDocentes(docentes) {
    // Limpiamos tanto tarjetas (<article>) como avisos (<p>) anteriores con clase .docencia
    const elementosAnteriores = contenedorDocentes.querySelectorAll(".docencia");
    elementosAnteriores.forEach((elemento) => elemento.remove());

    if (docentes.length === 0) {
      const aviso = document.createElement("p");
      aviso.className = "docencia";
      aviso.textContent = "No hay docentes registrados aún.";
      contenedorDocentes.appendChild(aviso);
      return;
    }

    docentes.forEach((docente) => {
      const articulo = document.createElement("article");
      articulo.className = "docencia";

      // Pasamos el ID del docente por la URL hacia vista_docente.html
      articulo.innerHTML = `
        <img src="${docente.foto || '../img/icono-docente.png'}" alt="Foto docente" width="50">
        <p>${docente.nombre || docente.correo}</p>
        <a href="vista_docente.html?id=${docente.id}" class="btn-ver-docente">VER DOCENTE</a>
      `;

      contenedorDocentes.appendChild(articulo);
    });
  }

  // =========================================================
  // 5. BUSCADOR EN TIEMPO REAL
  // =========================================================
  if (inputBuscador) {
    inputBuscador.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase().trim();
      const filtrados = listaDocentesGlobal.filter((docente) => {
        const nombre = (docente.nombre || "").toLowerCase();
        const correo = (docente.correo || "").toLowerCase();
        const dni = (docente.dni || "").toLowerCase();
        return nombre.includes(texto) || correo.includes(texto) || dni.includes(texto);
      });
      renderizarDocentes(filtrados);
    });
  }

  // =========================================================
  // 6. CREAR NUEVO DOCENTE (FIREBASE + MYSQL)
  // =========================================================
  formNuevoDocente.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre-docente")?.value.trim() || "Docente Certus";
    const correo = document.getElementById("correo-docente").value.trim();
    const dni = document.getElementById("dni-docente").value.trim();
    const password = inputPassword.value.trim();
    const categoria = document.getElementById("categoria-docente").value;

    const btnSubmit = formNuevoDocente.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = "CREANDO...";

    try {
      // PASO A: Registrar en Firebase Authentication (para permitir cambio de clave futuro)
      await createUserWithEmailAndPassword(auth, correo, password);

      // PASO B: Guardar en la base de datos MySQL vía API REST
      const respuesta = await fetch(API_URL_DOCENTES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre,
          correo,
          dni,
          password, // Tu backend en Node/PHP debe encriptar esto con bcrypt antes de guardar en MySQL
          categoria
        })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        alert(`Docente creado con éxito.\nCorreo: ${correo}\nContraseña generada: ${password}`);
        modal.close();
        formNuevoDocente.reset();
        // Recargamos la lista de abajo para que aparezca inmediatamente
        cargarDocentes();
      } else {
        alert(datos.mensaje || "Error al guardar el docente en MySQL.");
      }

    } catch (error) {
      console.error("Error al crear docente:", error);
      if (error.code === "auth/email-already-in-use") {
        alert("Ese correo ya está registrado en Firebase.");
      } else {
        alert("Ocurrió un error al crear el perfil. Revisa la consola.");
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "CREAR";
    }
  });

  // Inicializamos cargando los docentes al abrir la página
  cargarDocentes();
});