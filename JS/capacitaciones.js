const API_URL_CURSOS = "http://localhost:3000/api/capacitaciones";

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================
  // 1. VERIFICAR SESIÓN ACTIVA
  // =========================================================
  const sesionRaw = localStorage.getItem("usuario_certus") || sessionStorage.getItem("usuario_certus");
  if (!sesionRaw) {
    window.location.href = "login.html";
    return;
  }

  const usuarioActual = JSON.parse(sesionRaw);
  const esAdmin = usuarioActual.rol === "administrador";

  // Referencias de vistas y botones de navegación
  const headerLista = document.getElementById("header-lista");
  const vistaLista = document.getElementById("vista-lista");
  const vistaCrear = document.getElementById("vista-crear");
  const btnIrACrear = document.getElementById("btn-ir-a-crear");
  const btnVolver = document.getElementById("btn-volver");
  const contenedorCursos = document.getElementById("contenedor-cursos");
  const inputBuscador = document.getElementById("buscador-curso");

  // Si no es administrador, ocultamos el botón de crear capacitaciones
  if (!esAdmin && btnIrACrear) {
    btnIrACrear.style.display = "none";
  }

  // Referencias de Creación
  const formNuevoCurso = document.getElementById("form-nuevo-curso");
  const inputPortada = document.getElementById("portada-curso");
  const labelPortada = document.getElementById("label-portada");

  // Referencias de Modal Editar y Visualizaciones
  const modalEditar = document.getElementById("modal-editar-curso");
  const btnCerrarEditar = document.getElementById("btn-cerrar-editar");
  const formEditarCurso = document.getElementById("form-editar-curso");
  const tituloVisualizaciones = document.getElementById("titulo-visualizaciones");
  const listaDocentesVieron = document.getElementById("lista-docentes-vieron");

  // Referencias de Modal Reproductor YouTube
  const modalVideo = document.getElementById("modal-reproducir-video");
  const btnCerrarVideo = document.getElementById("btn-cerrar-video");
  const iframeYoutube = document.getElementById("iframe-youtube");
  const reproductorTitulo = document.getElementById("reproductor-titulo");
  const reproductorDescripcion = document.getElementById("reproductor-descripcion");

  let listaCursosGlobal = [];

  // =========================================================
  // 2. UTILIDAD: CONVERTIR CUALQUIER LINK DE YOUTUBE A EMBED
  // =========================================================
  function obtenerYoutubeEmbedUrl(url) {
    if (!url) return "";
    // Soporta youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
    }
    return url;
  }

  // =========================================================
  // 3. CAMBIO ENTRE VISTAS (LISTA <-> CREAR) Y MODALES
  // =========================================================
  btnIrACrear.addEventListener("click", () => {
    formNuevoCurso.reset();
    labelPortada.style.backgroundImage = "none";
    labelPortada.textContent = "+";
    headerLista.hidden = true;
    vistaLista.hidden = true;
    vistaCrear.hidden = false;
  });

  btnVolver.addEventListener("click", () => {
    vistaCrear.hidden = true;
    headerLista.hidden = false;
    vistaLista.hidden = false;
  });

  btnCerrarEditar.addEventListener("click", () => {
    modalEditar.close();
  });

  // Al cerrar el reproductor, vaciamos el src del iframe para detener el audio de YouTube
  btnCerrarVideo.addEventListener("click", () => {
    iframeYoutube.src = "";
    modalVideo.close();
  });

  // Vista previa de la imagen de portada al seleccionarla
  inputPortada.addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    if (archivo) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        labelPortada.textContent = "";
        labelPortada.style.backgroundImage = `url(${ev.target.result})`;
        labelPortada.style.backgroundSize = "cover";
        labelPortada.style.backgroundPosition = "center";
      };
      reader.readAsDataURL(archivo);
    }
  });

  // =========================================================
  // 4. CARGAR CAPACITACIONES DESDE MYSQL (API REST - GET)
  // =========================================================
  async function cargarCapacitaciones() {
    try {
      const respuesta = await fetch(API_URL_CURSOS);
      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        let cursos = datos.capacitaciones;

        // Si el usuario NO es administrador, filtramos:
        // 1. Solo cursos con estado "abierto"
        // 2. Solo cursos dirigidos a "todos" o a su misma escuela/categoría
        if (!esAdmin) {
          cursos = cursos.filter(
            (curso) =>
              curso.estado === "abierto" &&
              (curso.destinatario === "todos" || curso.destinatario === usuarioActual.categoria)
          );
        }

        listaCursosGlobal = cursos;
        renderizarCursos(listaCursosGlobal);
      }
    } catch (error) {
      console.error("Error al cargar capacitaciones:", error);
    }
  }

  // =========================================================
  // 5. DIBUJAR TARJETAS DE CURSOS
  // =========================================================
  function renderizarCursos(cursos) {
    // Limpiamos tarjetas previas manteniendo el <h2>
    contenedorCursos.querySelectorAll("article.tarjeta-curso, p.sin-cursos").forEach((el) => el.remove());

    if (cursos.length === 0) {
      contenedorCursos.insertAdjacentHTML(
        "beforeend",
        `<p class="sin-cursos">No hay capacitaciones disponibles en este momento.</p>`
      );
      return;
    }

    cursos.forEach((curso) => {
      const articulo = document.createElement("article");
      articulo.className = "tarjeta-curso";

      // Etiqueta visual para el admin si el curso está cerrado
      const badgeEstado =
        esAdmin && curso.estado === "cerrado"
          ? `<span style="background: #d9534f; color: #fff; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">CERRADO</span>`
          : "";

      articulo.innerHTML = `
        <img src="${curso.portada || '../img/curso_excel.png'}" alt="${curso.titulo}" width="100" style="cursor: pointer;">
        <div class="info-curso">
          <h3>${curso.titulo} ${badgeEstado}</h3>
          <p>${curso.descripcion}</p>
          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn-ver-clase">VER CLASE</button>
            ${esAdmin ? `<button type="button" class="btn-editar-curso">EDITAR</button>` : ""}
          </div>
        </div>
      `;

      // Evento para reproducir el video de YouTube en el sitio web
      const abrirReproductor = () => abrirModalVideo(curso);
      articulo.querySelector("img").addEventListener("click", abrirReproductor);
      articulo.querySelector(".btn-ver-clase").addEventListener("click", abrirReproductor);

      // Evento para abrir el modal de edición (solo admin)
      if (esAdmin) {
        articulo.querySelector(".btn-editar-curso").addEventListener("click", () => {
          abrirModalEditar(curso);
        });
      }

      contenedorCursos.appendChild(articulo);
    });
  }

  // =========================================================
  // 6. REPRODUCIR VIDEO DE YOUTUBE Y REGISTRAR VISUALIZACIÓN
  // =========================================================
  async function abrirModalVideo(curso) {
    reproductorTitulo.textContent = curso.titulo;
    reproductorDescripcion.textContent = curso.descripcion;
    iframeYoutube.src = obtenerYoutubeEmbedUrl(curso.video_url);
    modalVideo.showModal();

    // Registramos en MySQL que este usuario visualizó el curso
    try {
      await fetch(`${API_URL_CURSOS}/${curso.id}/visualizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: usuarioActual.id,
          nombre: usuarioActual.nombre,
          correo: usuarioActual.correo
        })
      });
    } catch (error) {
      console.warn("No se pudo registrar la visualización:", error);
    }
  }

  // =========================================================
  // 7. CREAR NUEVA CAPACITACIÓN (POST CON FORMDATA PARA PORTADA)
  // =========================================================
  formNuevoCurso.addEventListener("submit", async (e) => {
    e.preventDefault();

    const destinatario = document.getElementById("destinatario-curso").value;
    const quiereNotificar = document.getElementById("notificar_docentes").checked;

    // Regla solicitada: Si el creador pertenece a la misma escuela seleccionada,
    // el backend usará creadorId para no auto-notificarlo a él mismo.
    const formData = new FormData(formNuevoCurso);
    formData.append("creadorId", usuarioActual.id);
    formData.append("creadorCategoria", usuarioActual.categoria || "");
    formData.append("enviarNotificacion", quiereNotificar ? "1" : "0");

    const btnSubmit = formNuevoCurso.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;
    btnSubmit.textContent = "SUBIENDO...";

    try {
      const respuesta = await fetch(API_URL_CURSOS, {
        method: "POST",
        body: formData // Enviamos FormData para soportar la imagen de portada
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        alert("Capacitación subida correctamente.");
        vistaCrear.hidden = true;
        headerLista.hidden = false;
        vistaLista.hidden = false;
        cargarCapacitaciones();
      } else {
        alert(datos.mensaje || "Error al subir la capacitación.");
      }
    } catch (error) {
      console.error("Error al crear capacitación:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "SUBIR CAPACITACIÓN";
    }
  });

  // =========================================================
  // 8. MODAL EDITAR CAPACITACIÓN Y VER VISUALIZACIONES
  // =========================================================
  async function abrirModalEditar(curso) {
    document.getElementById("edit-id-curso").value = curso.id;
    document.getElementById("edit-estado").value = curso.estado;
    document.getElementById("edit-destinatario").value = curso.destinatario;
    document.getElementById("edit-titulo").value = curso.titulo;
    document.getElementById("edit-descripcion").value = curso.descripcion;
    document.getElementById("edit-video").value = curso.video_url;

    // Limpiamos y consultamos la lista de docentes que visualizaron este curso
    tituloVisualizaciones.textContent = "DOCENTES QUE VISUALIZARON (Cargando...)";
    listaDocentesVieron.innerHTML = "";
    modalEditar.showModal();

    try {
      const respuesta = await fetch(`${API_URL_CURSOS}/${curso.id}/visualizaciones`);
      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        const espectadores = datos.visualizaciones || [];
        tituloVisualizaciones.textContent = `DOCENTES QUE VISUALIZARON (${espectadores.length})`;

        if (espectadores.length === 0) {
          listaDocentesVieron.innerHTML = "<li>Ningún docente ha visto esta capacitación aún.</li>";
        } else {
          espectadores.forEach((doc) => {
            const li = document.createElement("li");
            li.style.padding = "4px 0";
            li.textContent = `• ${doc.nombre} (${doc.correo})`;
            listaDocentesVieron.appendChild(li);
          });
        }
      }
    } catch (error) {
      tituloVisualizaciones.textContent = "DOCENTES QUE VISUALIZARON (0)";
    }
  }

  // Guardar cambios al editar capacitación (PUT)
  formEditarCurso.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cursoId = document.getElementById("edit-id-curso").value;
    const formData = new FormData(formEditarCurso);

    try {
      const respuesta = await fetch(`${API_URL_CURSOS}/${cursoId}`, {
        method: "PUT",
        body: formData
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.exito) {
        alert("Capacitación actualizada con éxito.");
        modalEditar.close();
        cargarCapacitaciones();
      } else {
        alert(datos.mensaje || "No se pudo actualizar la capacitación.");
      }
    } catch (error) {
      console.error("Error al actualizar curso:", error);
      alert("Error de conexión con el servidor.");
    }
  });

  // =========================================================
  // 9. BUSCADOR DE CURSOS EN TIEMPO REAL
  // =========================================================
  if (inputBuscador) {
    inputBuscador.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase().trim();
      const filtrados = listaCursosGlobal.filter(
        (c) =>
          c.titulo.toLowerCase().includes(texto) ||
          c.descripcion.toLowerCase().includes(texto)
      );
      renderizarCursos(filtrados);
    });
  }

  // Carga inicial
  cargarCapacitaciones();
});