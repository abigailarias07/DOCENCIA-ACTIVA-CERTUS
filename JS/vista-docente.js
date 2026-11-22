// URL base de tu API REST para consultar y actualizar un docente específico
const API_URL_DOCENTES = "http://localhost:3000/api/docentes";

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1. PROTECCIÓN DE RUTA (SOLO ADMINISTRADORES)
  // =========================================================
  const sesion = localStorage.getItem("usuario_certus") || sessionStorage.getItem("usuario_certus");
  if (!sesion) {
    window.location.href = "login.html";
    return;
  }

  // =========================================================
  // 2. OBTENER EL ID DEL DOCENTE DESDE LA URL (?id=...)
  // =========================================================
  const params = new URLSearchParams(window.location.search);
  const docenteId = params.get("id");

  if (!docenteId) {
    alert("No se seleccionó ningún docente.");
    window.history.back();
    return;
  }

  // Referencias del DOM
  const btnCerrarVer = document.getElementById("btn-cerrar-ver");
  const imgFoto = document.getElementById("docente-foto");
  const txtNombre = document.getElementById("docente-nombre");
  const txtCorreo = document.getElementById("docente-correo");
  const txtDni = document.getElementById("docente-dni");
  const btnEstadoPerfil = document.getElementById("btn-estado-perfil");

  const contAsignadas = document.getElementById("lista-asignadas");
  const contProgreso = document.getElementById("lista-progreso");
  const contCulminadas = document.getElementById("lista-culminadas");

  let estadoActivoActual = true; // true = habilitado, false = deshabilitado

  // Botón X para volver atrás
  btnCerrarVer.addEventListener("click", () => {
    window.history.back();
  });

  // =========================================================
  // 3. CARGAR DATOS DEL DOCENTE Y SUS CAPACITACIONES (MYSQL)
  // =========================================================
  async function cargarDetalleDocente() {
    try {
      const respuesta = await fetch(`${API_URL_DOCENTES}/${docenteId}`);
      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        const docente = datos.docente;

        // Llenar panel izquierdo
        imgFoto.src = docente.foto || "img/icono-docente.png";
        txtNombre.textContent = docente.nombre;
        txtCorreo.textContent = docente.correo;
        txtDni.textContent = `DNI: ${docente.dni}`;

        // Configurar el estado inicial del botón Deshabilitar/Habilitar
        // Asumimos que en MySQL 1 = activo y 0 = deshabilitado
        estadoActivoActual = Boolean(docente.activo);
        actualizarBotonEstado(estadoActivoActual);

        // Llenar panel derecho (capacitaciones asignadas, en progreso y culminadas)
        renderizarCapacitaciones(datos.capacitaciones || []);
      } else {
        alert(datos.mensaje || "No se encontró la información del docente.");
      }
    } catch (error) {
      console.error("Error al cargar detalle del docente:", error);
      txtNombre.textContent = "Error de conexión";
    }
  }

  // =========================================================
  // 4. ACTUALIZAR VISUALMENTE EL BOTÓN DESHABILITAR / HABILITAR
  // =========================================================
  function actualizarBotonEstado(estaActivo) {
    if (estaActivo) {
      btnEstadoPerfil.textContent = "DESHABILITAR PERFIL";
      btnEstadoPerfil.style.backgroundColor = ""; // Usa el color rojo/base de tu CSS
      btnEstadoPerfil.classList.remove("perfil-deshabilitado");
    } else {
      btnEstadoPerfil.textContent = "HABILITAR PERFIL";
      btnEstadoPerfil.style.backgroundColor = "#28a745"; // Verde para indicar que se puede reactivar
      btnEstadoPerfil.classList.add("perfil-deshabilitado");
    }
  }

  // Evento al hacer clic en DESHABILITAR / HABILITAR PERFIL
  btnEstadoPerfil.addEventListener("click", async () => {
    const nuevoEstado = !estadoActivoActual;
    const accionTexto = nuevoEstado ? "habilitar" : "deshabilitar";

    const confirmar = confirm(`¿Estás seguro de que deseas ${accionTexto} el acceso de este docente?`);
    if (!confirmar) return;

    btnEstadoPerfil.disabled = true;

    try {
      const respuesta = await fetch(`${API_URL_DOCENTES}/${docenteId}/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ activo: nuevoEstado ? 1 : 0 })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        estadoActivoActual = nuevoEstado;
        actualizarBotonEstado(estadoActivoActual);
        alert(
          nuevoEstado
            ? "Perfil habilitado. El docente ya puede volver a iniciar sesión."
            : "Perfil deshabilitado. El docente ya no podrá iniciar sesión hasta que lo habilites."
        );
      } else {
        alert(datos.mensaje || "No se pudo cambiar el estado del perfil.");
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      btnEstadoPerfil.disabled = false;
    }
  });

  // =========================================================
  // 5. DIBUJAR LAS CAPACITACIONES SEGÚN SU ESTADO
  // =========================================================
  function renderizarCapacitaciones(capacitaciones) {
    // Limpiamos tarjetas previas manteniendo los títulos <h3>
    limpiarContenedor(contAsignadas);
    limpiarContenedor(contProgreso);
    limpiarContenedor(contCulminadas);

    const asignadas = capacitaciones.filter((c) => c.estado === "asignada");
    const enProgreso = capacitaciones.filter((c) => c.estado === "progreso");
    const culminadas = capacitaciones.filter((c) => c.estado === "culminada");

    // 5.1 Asignadas
    if (asignadas.length === 0) {
      contAsignadas.insertAdjacentHTML("beforeend", `<p class="sin-cursos">No tiene capacitaciones asignadas.</p>`);
    } else {
      asignadas.forEach((curso) => {
        contAsignadas.insertAdjacentHTML(
          "beforeend",
          `
          <article class="capacitacion-asignado">
            <h4>${curso.titulo}</h4>
            <img src="${curso.imagen || 'img/curso_excel.png'}" alt="${curso.titulo}" width="80">
          </article>
          `
        );
      });
    }

    // 5.2 En Progreso (con barra/texto de porcentaje)
    if (enProgreso.length === 0) {
      contProgreso.insertAdjacentHTML("beforeend", `<p class="sin-cursos">No tiene capacitaciones en progreso.</p>`);
    } else {
      enProgreso.forEach((curso) => {
        const porcentaje = curso.progreso || 0;
        contProgreso.insertAdjacentHTML(
          "beforeend",
          `
          <article class="capacitaciones-progreso">
            <h4>${curso.titulo}</h4>
            <img src="${curso.imagen || 'img/curso_excel.png'}" alt="${curso.titulo}" width="80">
            <div class="porcentaje-progreso" style="width: 100%; background: #e0e0e0; border-radius: 5px; margin-top: 8px;">
              <div style="width: ${porcentaje}%; background: #0056b3; color: white; font-size: 12px; text-align: center; border-radius: 5px;">
                ${porcentaje}%
              </div>
            </div>
          </article>
          `
        );
      });
    }

    // 5.3 Culminadas
    if (culminadas.length === 0) {
      contCulminadas.insertAdjacentHTML("beforeend", `<p class="sin-cursos">Aún no ha culminado capacitaciones.</p>`);
    } else {
      culminadas.forEach((curso) => {
        contCulminadas.insertAdjacentHTML(
          "beforeend",
          `
          <article class="capacitaciones-culminadas">
            <h4>${curso.titulo}</h4>
            <img src="${curso.imagen || 'img/curso_excel.png'}" alt="${curso.titulo}" width="80">
          </article>
          `
        );
      });
    }
  }

  function limpiarContenedor(contenedor) {
    contenedor.querySelectorAll("article, p.sin-cursos").forEach((el) => el.remove());
  }

  // Ejecutar carga inicial
  cargarDetalleDocente();
});