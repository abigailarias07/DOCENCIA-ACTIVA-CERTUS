"use strict";

// 1. DATOS DE CAPACITACIONES (EJEMPLO)
const cursos = {
  excel: {
    nombre: "Excel Básico para Docentes", inicial: "X", tema: "excel", avance: 40,
    descripcion: "Conocerás el entorno de Excel y sus principales herramientas para organizar información.",
    clases: ["Fundamentos de Excel", "Fórmulas y funciones", "Gráficos y visualización", "Tablas y organización de datos"],
    descripciones: [
      "Conocerás el entorno de Excel, sus partes principales y las herramientas básicas para crear y administrar hojas de cálculo.",
      "Aprenderás a utilizar fórmulas y funciones para realizar cálculos, procesar información y resolver tareas frecuentes de manera sencilla.",
      "Descubrirás cómo crear gráficos y elegir la visualización adecuada para representar datos y comunicar resultados con claridad.",
      "Aprenderás a organizar información en tablas, ordenar y filtrar datos para trabajar de forma más clara y eficiente."
    ]
  },
  metodologias: {
    nombre: "Metodologías Activas de Aprendizaje", inicial: "▶", tema: "metodos", avance: 100,
    descripcion: "Revisa estrategias participativas para fortalecer la enseñanza y el aprendizaje.",
    clases: ["Aprendizaje basado en proyectos", "Trabajo colaborativo", "Evaluación formativa"],
    descripciones: [
      "Conocerás cómo diseñar experiencias de aprendizaje a partir de retos y proyectos que conecten los contenidos con situaciones reales.",
      "Revisarás estrategias para promover la participación, la comunicación y la construcción conjunta de conocimientos entre estudiantes.",
      "Explorarás herramientas para recoger evidencias de aprendizaje, brindar retroalimentación y acompañar el progreso de tus estudiantes."
    ]
  },
  powerpoint: {
    nombre: "PowerPoint Profesional para Docentes", inicial: "P", tema: "powerpoint", avance: 40,
    descripcion: "Aprende a diseñar presentaciones claras para acompañar tus clases.",
    clases: ["Diseño de diapositivas", "Imágenes y diagramas", "Presentación final"],
    descripciones: [
      "Aprenderás a crear diapositivas ordenadas, aplicar diseños y organizar el contenido para comunicar tus ideas de manera efectiva.",
      "Conocerás cómo incorporar imágenes, formas y diagramas para explicar conceptos y complementar visualmente tus clases.",
      "Integrarás lo aprendido para preparar una presentación completa, clara y adecuada para una sesión educativa."
    ]
  }
};

// 2. FUNCIONES COMUNES
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const guardar = (clave, valor, sesion = false) => {
  try { (sesion ? sessionStorage : localStorage).setItem(clave, valor); } catch { /* Almacenamiento bloqueado. */ }
};
const leer = (clave, sesion = false) => {
  try { return (sesion ? sessionStorage : localStorage).getItem(clave); } catch { return null; }
};
const quitar = (clave, sesion = false) => {
  try { (sesion ? sessionStorage : localStorage).removeItem(clave); } catch { /* Almacenamiento bloqueado. */ }
};
const avisar = (selector, mensaje) => { const elemento = $(selector); if (elemento) elemento.textContent = mensaje; };
const correoValido = (correo) => /^[^\s@]+@certus\.edu\.pe$/i.test(correo);
const paginaActual = () => location.pathname.split("/").pop();

function actualizarAvance(barra, porcentaje, avance) {
  const progreso = $(barra);
  progreso.style.width = `${avance}%`;
  progreso.parentElement.setAttribute("aria-valuenow", String(avance));
  progreso.closest(".barra").classList.toggle("completa", avance === 100);
  $(porcentaje).textContent = `${avance}%`;
}

// 2.1. BÚSQUEDA DE CAPACITACIONES
function buscarCapacitaciones() {
  const formulario = $("#buscador-capacitaciones");
  const campo = $("#buscar-curso");
  const contenedor = $("#lista-capacitaciones");
  const mensaje = $("#sin-resultados-cursos");
  if (!formulario || !campo || !contenedor || !mensaje) return;

  const filtrar = () => {
    const consulta = campo.value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let visibles = 0;
    contenedor.querySelectorAll(".tarjeta-curso").forEach((tarjeta) => {
      const nombre = (tarjeta.querySelector("h2")?.textContent || "")
        .toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const coincide = nombre.includes(consulta);
      tarjeta.hidden = !coincide;
      if (coincide) visibles++;
    });
    mensaje.hidden = visibles !== 0;
  };

  campo.addEventListener("input", filtrar);
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    filtrar();
    campo.focus();
  });
}

// 3. INICIO DE SESIÓN Y CONTRASEÑAS
function mostrarContrasena() {
  $$('[data-mostrar-clave]').forEach((boton) => boton.addEventListener("click", () => {
    const campo = document.getElementById(boton.dataset.mostrarClave);
    if (!campo) return;
    const visible = campo.type === "password";
    campo.type = visible ? "text" : "password";
    boton.textContent = visible ? "Ocultar" : "Mostrar";
    boton.setAttribute("aria-label", `${visible ? "Ocultar" : "Mostrar"} contraseña`);
  }));
}

function iniciarSesion() {
  const formulario = $("#form-login");
  if (!formulario) return;
  const correo = $("#correo"), clave = $("#clave"), recordar = $("#recordar");
  const anterior = leer("correo_docente_certus");
  if (anterior) { correo.value = anterior; recordar.checked = true; }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const valor = correo.value.trim();
    if (!correoValido(valor)) {
      avisar("#mensaje-login", "Ingresa un correo institucional @certus.edu.pe.");
      correo.focus();
    } else if (!clave.value) {
      avisar("#mensaje-login", "Ingresa tu contraseña.");
      clave.focus();
    } else {
      // Solo se guarda el correo; el acceso es demostrativo y no verifica cuentas reales.
      recordar.checked ? guardar("correo_docente_certus", valor) : quitar("correo_docente_certus");
      guardar("sesion_docente_certus", valor, true);
      location.assign("mis_capacitaciones.html");
    }
  });
}

function recuperarContrasena() {
  if (!$("#form-recuperar")) return;
  const pasos = $$("[data-paso]");
  const cambiarPaso = (numero) => {
    pasos.forEach((paso) => { paso.hidden = Number(paso.dataset.paso) !== numero; });
    $$('[data-paso] .mensaje').forEach((mensaje) => { mensaje.textContent = ""; });
    pasos.find((paso) => Number(paso.dataset.paso) === numero)?.querySelector("h1")?.focus();
  };

  $("#form-recuperar").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (!correoValido($("#correo-recuperar").value.trim())) {
      avisar("#mensaje-recuperar", "Ingresa un correo @certus.edu.pe válido.");
      return;
    }
    cambiarPaso(2);
  });
  $("#form-codigo").addEventListener("submit", (evento) => {
    evento.preventDefault();
    if ($$(".codigo input").map((campo) => campo.value).join("") !== "123456") {
      avisar("#mensaje-codigo", "Para esta demostración, utiliza el código 123456.");
      return;
    }
    cambiarPaso(3);
  });
  $("#form-nueva-clave").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nueva = $("#nueva-clave").value;
    if (nueva.length < 8) avisar("#mensaje-clave", "La contraseña debe tener al menos 8 caracteres.");
    else if (nueva !== $("#confirmar-clave").value) avisar("#mensaje-clave", "Las contraseñas no coinciden.");
    else { evento.currentTarget.reset(); cambiarPaso(4); }
  });
  $$('[data-ir-paso]').forEach((boton) => boton.addEventListener("click", () => cambiarPaso(Number(boton.dataset.irPaso))));

  const casillas = $$(".codigo input");
  casillas.forEach((casilla, indice) => {
    casilla.addEventListener("input", () => {
      casilla.value = casilla.value.replace(/\D/g, "").slice(0, 1);
      if (casilla.value) casillas[indice + 1]?.focus();
    });
    casilla.addEventListener("keydown", (evento) => {
      if (evento.key === "Backspace" && !casilla.value) casillas[indice - 1]?.focus();
    });
    casilla.addEventListener("paste", (evento) => {
      const digitos = (evento.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      if (!digitos) return;
      evento.preventDefault();
      casillas.forEach((campo, i) => { campo.value = digitos[i] || ""; });
      casillas[Math.min(digitos.length, 5)].focus();
    });
  });
}

// 4. DETALLE DE CURSO Y REPRODUCTOR
function verDetalle() {
  if (!$("#detalle-curso")) return;
  const solicitado = new URLSearchParams(location.search).get("curso");
  const codigo = Object.hasOwn(cursos, solicitado) ? solicitado : "excel";
  const curso = cursos[codigo];
  const lista = $("#lista-lecciones");
  const tituloClase = $("#nombre-clase");
  const descripcionClase = $("#descripcion-clase");
  const botonVerClase = $("#ver-clase");
  const portadaClase = $("#portada-clase");
  const archivoReproductor = curso.avance === 100
    ? "reproductor_completado.html"
    : "reproductor_pendiente.html";

  $("#titulo-curso").textContent = curso.nombre;
  [["#portada-curso", "imagen-curso"], ["#portada-clase", "imagen-curso grande"]].forEach(([selector, estilo]) => {
    $(selector).textContent = curso.inicial;
    $(selector).className = `${estilo} ${curso.tema}`;
  });
  actualizarAvance("#barra-curso", "#porcentaje-curso", curso.avance);
  document.title = `${curso.nombre} | CERTUS`;

  const seleccionarClase = (numero) => {
    tituloClase.textContent = curso.clases[numero];
    descripcionClase.textContent = curso.descripciones?.[numero] || curso.descripcion;
    portadaClase.textContent = curso.inicial;
    botonVerClase.href = `${archivoReproductor}?curso=${codigo}&clase=${numero}`;

    lista.querySelectorAll("a").forEach((enlace, indice) => {
      const seleccionada = indice === numero;
      enlace.classList.toggle("seleccionada", seleccionada);
      if (seleccionada) enlace.setAttribute("aria-current", "true");
      else enlace.removeAttribute("aria-current");
    });
  };

  lista.replaceChildren();
  curso.clases.forEach((nombre, numero) => {
    const elemento = document.createElement("li");
    const enlace = document.createElement("a");
    enlace.href = `#clase-${numero + 1}`;
    enlace.textContent = `${numero + 1}. ${nombre}`;
    enlace.addEventListener("click", (evento) => {
      evento.preventDefault();
      seleccionarClase(numero);
    });
    elemento.append(enlace);
    lista.append(elemento);
  });

  seleccionarClase(0);
}

function verClase() {
  if (!$("#contenido-clase")) return;
  const parametros = new URLSearchParams(location.search);
  const completado = paginaActual() === "reproductor_completado.html";
  const solicitado = parametros.get("curso");
  const coincide = Object.hasOwn(cursos, solicitado) && (cursos[solicitado].avance === 100) === completado;
  const codigo = coincide ? solicitado : (completado ? "metodologias" : "excel");
  const curso = cursos[codigo];
  const indice = Number(parametros.get("clase"));
  const numero = Number.isInteger(indice) && indice >= 0 && indice < curso.clases.length ? indice : 0;
  const archivo = completado ? "reproductor_completado.html" : "reproductor_pendiente.html";

  $("#titulo-clase").textContent = curso.clases[numero];
  $("#curso-clase").textContent = curso.nombre;
  $("#volver-detalle").href = `detalle_curso.html?curso=${codigo}`;
  actualizarAvance("#progreso-clase", "#porcentaje-clase", curso.avance);
  [["#clase-anterior", numero - 1, numero === 0], ["#clase-siguiente", numero + 1, numero === curso.clases.length - 1]].forEach(([selector, indiceClase, oculto]) => {
    const boton = $(selector);
    // Reservar siempre el espacio del botón, incluso en los extremos.
    boton.hidden = false;
    boton.style.visibility = oculto ? "hidden" : "visible";
    boton.style.pointerEvents = oculto ? "none" : "";
    boton.setAttribute("aria-hidden", String(oculto));
    boton.tabIndex = oculto ? -1 : 0;
    boton.href = `${archivo}?curso=${codigo}&clase=${indiceClase}`;
  });
  if ($("#ir-constancia")) $("#ir-constancia").hidden = curso.avance !== 100;
  document.title = `${curso.clases[numero]} | CERTUS`;
}

// 5. NOTIFICACIONES Y PERFIL
function notificaciones() {
  const clave = "avisos_leidos_certus";
  let leidos = [];
  try { leidos = JSON.parse(leer(clave) || "[]"); } catch { /* Registro inexistente. */ }
  if (!Array.isArray(leidos)) leidos = [];

  const actualizar = () => {
    $$('[data-aviso]').forEach((aviso) => {
      const leido = leidos.includes(aviso.dataset.aviso);
      aviso.classList.toggle("no-leido", !leido);
      const boton = aviso.querySelector("button");
      if (boton) { boton.disabled = leido; boton.textContent = leido ? "Leída" : "Marcar como leída"; }
    });
    const contador = $("#contador-avisos");
    if (contador) {
      const pendientes = 2 - ["curso", "constancia"].filter((id) => leidos.includes(id)).length;
      contador.textContent = pendientes;
      contador.hidden = pendientes === 0;
    }
  };

  $$('[data-aviso]').forEach((aviso) => aviso.querySelector("button")?.addEventListener("click", () => {
    if (!leidos.includes(aviso.dataset.aviso)) leidos.push(aviso.dataset.aviso);
    guardar(clave, JSON.stringify(leidos));
    actualizar();
  }));
  actualizar();
}

function perfil() {
  if ($("#correo-perfil")) $("#correo-perfil").textContent = leer("sesion_docente_certus", true) || "No hay una sesión iniciada";
  $("#cerrar-sesion")?.addEventListener("click", () => quitar("sesion_docente_certus", true));
}

// 6. NAVEGACIÓN Y CONSTANCIAS
function prepararNavegacion() {
  $$(".navegacion a").forEach((enlace) => {
    if (enlace.getAttribute("href") === paginaActual()) enlace.setAttribute("aria-current", "page");
  });
  $("#imprimir-constancia")?.addEventListener("click", () => window.print());
}

prepararNavegacion();
buscarCapacitaciones();
mostrarContrasena();
iniciarSesion();
recuperarContrasena();
verDetalle();
verClase();
notificaciones();
perfil();