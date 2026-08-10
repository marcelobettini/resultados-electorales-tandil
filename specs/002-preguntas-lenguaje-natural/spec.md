# Feature Specification: Preguntas en lenguaje natural sobre los resultados electorales

**Feature Branch**: `002-preguntas-lenguaje-natural`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Agregar un cuadro de preguntas en lenguaje natural sobre los resultados electorales de Tandil: el usuario escribe una pregunta (ej. '¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?'), un LLM interpreta el intento, el backend ejecuta la consulta sobre la base MySQL existente y muestra la respuesta en texto debajo del input."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
-->

### User Story 1 - Hacer una pregunta en lenguaje natural y obtener la respuesta (Priority: P1)

Un ciudadano entra a la portada de la plataforma, ve un cuadro de pregunta ("Hacé una pregunta sobre los resultados electorales…"), escribe por ejemplo "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?", lo envía y recibe debajo del cuadro una respuesta en texto con las cifras del escrutinio definitivo. Debajo de la respuesta se muestra la línea "Interpreté: …" con el año, la categoría de pregunta y el cargo interpretados, para que el ciudadano pueda auditar qué entendió el sistema.

**Why this priority**: Es el propósito central de la función: resolver una consulta ciudadana con lenguaje cotidiano y cifras oficiales verificables. Sin este flujo no hay producto.

**Independent Test**: Puede probarse de punta a punta escribiendo una pregunta válida en la portada, enviándola y verificando que (a) aparece una respuesta textual, (b) las cifras coinciden con los valores oficiales de la base, (c) aparece la línea "Interpreté: …", y (d) el envío de una segunda pregunta reemplaza a la primera sin acumular historial.

**Acceptance Scenarios**:

1. **Given** un visitante en la portada con un cuadro de pregunta, **When** escribe una pregunta válida sobre una elección (p. ej. con año explícito) y la envía, **Then** aparece debajo una respuesta en texto con las cifras del escrutinio definitivo y la línea "Interpreté: …" con el año, la categoría y el cargo interpretados.
2. **Given** una respuesta ya mostrada en pantalla, **When** el visitante envía una pregunta nueva, **Then** la respuesta anterior se reemplaza por completo (no hay hilo ni historial de conversación).
3. **Given** una pregunta escrita en español coloquial (sin terminología técnica), **When** el visitante la envía, **Then** el sistema la entiende correctamente y la respuesta corresponde a la intención real de la pregunta.

---

### User Story 2 - Preguntar por la última elección sin indicar el año (Priority: P2)

Un ciudadano pregunta "¿Quién ganó la última elección?" sin saber ni mencionar el año. El sistema interpreta "última elección" como la más reciente con datos cargados y responde con esa elección, informando en la línea "Interpreté: …" de qué año se trata. El comportamiento se mantiene correcto cuando se carga una elección nueva en el futuro: no hay un año fijo en el sistema.

**Why this priority**: Es una consulta frecuente y refuerza la confianza en que el histórico se actualiza solo; sin esto el ciudadano debe conocer el año exacto.

**Independent Test**: Puede probarse enviando "¿Quién ganó la última elección?" y verificando que la respuesta corresponde al año más reciente con datos y que la línea "Interpreté: …" lo indica; luego puede repetirse la prueba tras incorporar una elección nueva al histórico para confirmar que el año resuelto cambia.

**Acceptance Scenarios**:

1. **Given** un histórico con varias elecciones cargadas, **When** el visitante pregunta por la "última elección", **Then** el sistema responde con la elección más reciente con datos y la línea "Interpreté: …" muestra ese año.
2. **Given** una pregunta sin año ("¿Quién ganó?"), **When** el sistema interpreta la intención, **Then** la resuelve como "última elección" (año más reciente) en lugar de usar un año fijo predefinido.

---

### User Story 3 - Recibir una explicación clara cuando la pregunta no se puede responder (Priority: P2)

Un ciudadano hace una pregunta que el sistema no puede resolver: porque pide algo que no es de esta plataforma ("¿quién ganó la gobernación?"), porque compara el mismo partido entre años ("¿cómo le fue a la UCR desde 1963?") y los nombres de las agrupaciones pueden cambiar entre elecciones, porque la categoría aún no está implementada, porque es confusa, o porque el año consultado no tiene datos. En todos los casos recibe un mensaje claro y honesto que explica por qué no se puede responder —nunca una cifra inventada ni una respuesta evasiva—.

**Why this priority**: La confianza en las cifras es el activo central del proyecto (resultado oficial definitivo). Responder mal o inventar destruye esa confianza; explicar los límites la protege.

**Independent Test**: Puede probarse enviando una batería de preguntas fuera de alcance (nacional/provincial, comparación de partidos entre años, categoría no implementada, pregunta confusa, año sin datos) y verificando que cada una recibe el mensaje correspondiente sin cifras fabricadas.

**Acceptance Scenarios**:

1. **Given** una pregunta fuera de alcance del dataset (cargo provincial/nacional, PASO), **When** el visitante la envía, **Then** recibe una explicación clara de por qué no se puede responder, sin cifras.
2. **Given** una pregunta que compara el mismo partido entre años distintos, **When** el visitante la envía, **Then** recibe una explicación de que esa comparación no es confiable en esta base (nombres y números de lista cambian entre elecciones).
3. **Given** una pregunta de una categoría aún no implementada, **When** el visitante la envía, **Then** recibe "esta consulta todavía no está disponible".
4. **Given** una pregunta confusa o sin relación con las elecciones de Tandil, **When** el visitante la envía, **Then** recibe un mensaje de reformulación ("no entendí, reformulá").
5. **Given** una pregunta sobre un año que no tiene datos cargados, **When** el visitante la envía, **Then** recibe un aviso de "sin datos para ese año".

---

### User Story 4 - Usar la pregunta con lector de pantalla y sin conexión (Priority: P3)

Una persona con discapacidad visual usa un lector de pantalla: el cuadro tiene una etiqueta asociada y el resultado (y su estado: cargando, error, fuera de alcance) se anuncia automáticamente en una región de actualización dinámica. Una persona sin conexión ve el cuadro deshabilitado con un mensaje claro, mientras el resto de la plataforma (consulta visual del histórico) sigue funcionando.

**Why this priority**: La accesibilidad WCAG 2.2 AA y la PWA offline son requisitos de la constitución del proyecto; este flujo garantiza que la función nueva no los rompe.

**Independent Test**: Puede probarse con una auditoría automatizada de accesibilidad sobre el componente, con un recorrido manual de teclado/lector de pantalla, y verificando en modo sin conexión que el cuadro queda deshabilitado sin afectar el resto del sitio.

**Acceptance Scenarios**:

1. **Given** un lector de pantalla activo, **When** el visitante envía una pregunta, **Then** el resultado y los cambios de estado se anuncian automáticamente y el campo está correctamente etiquetado.
2. **Given** el sitio sin conexión (modo offline de la PWA), **When** el visitante abre la portada, **Then** el cuadro de pregunta está deshabilitado con un mensaje claro y el resto de la plataforma sigue funcionando.

---

### Edge Cases

- **Pregunta sobre un año sin datos cargados**: el sistema responde "No hubo elección municipal ese año" (US3-AC5), sin cifras.
- **Pregunta vacía o solo con espacios**: no se envía; se muestra una validación en el campo ("Escribí una pregunta para poder responder").
- **Empate entre el primero y el segundo**: se reporta explícitamente (aviso de advertencia); el sistema no elige un "segundo puesto" arbitrario.
- **Huecos de datos (valores faltantes) en actas viejas**: porcentaje no disponible antes de ~2003, padrón y totales NULL en parte del histórico: se mencionan en la advertencia de la respuesta, no se omiten en silencio ni se completan con valores calculados.
- **Partido que compitió y sacó 0 votos** vs. **partido sin dato**: el 0 literal es un resultado válido; el dato faltante (NULL) se señala en la advertencia.
- **1963**: no se eligió el cargo de "Intendente" por separado; el sistema no aplica reglas en tiempo de consulta porque la fila ya está resuelta en los datos.
- **Patrón bienal desde 1965**: un año con intendente y el siguiente sin él es normal; no se señala como anomalía.
- **Año sin elección de un cargo determinado** (p. ej. intendente en años de solo concejales): la respuesta lo indica y usa los datos disponibles de ese año.
- **Servicio de interpretación o base de datos no disponibles**: se muestra un estado de "error del sistema" claro, sin respuestas vacías ni inventadas.
- **Misma pregunta repetida**: la respuesta se devuelve desde la memoria temporal sin reprocesar (misma cifra, misma advertencia).
- **Envíos repetidos en un período corto desde la misma dirección**: el sistema limita el ritmo sin impedir el uso normal de un ciudadano ocasional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La portada MUST mostrar un único cuadro de preguntas en lenguaje natural, con una etiqueta visible, sin hilo de conversación.
- **FR-002**: Cada envío MUST reemplazar por completo la respuesta anterior; el sistema no acumula historial ni mantiene una conversación entre turnos.
- **FR-003**: El sistema MUST reconocer al menos las siguientes categorías de pregunta (taxonomía cerrada y extensible): ganador de la elección; ganador de la intendencia; diferencia de votos entre el primero y el segundo; ranking de los N primeros; totales de una elección (votantes, padrón, votos válidos, blancos, nulos, mesas); bancas por partido; personas electas por cargo; y serie del total de votos por año.
- **FR-004**: Toda respuesta con cifras MUST derivarse exclusivamente de los valores del escrutinio definitivo almacenados en la base; el sistema nunca genera, calcula ni inventa cifras.
- **FR-005**: Las preguntas cuya categoría esté reconocida pero aún no implementada MUST recibir "esta consulta todavía no está disponible", y el sistema no debe intentar responderlas.
- **FR-006**: Las preguntas fuera del alcance del dataset (cargos provinciales/nacionales, PASO, otras localidades, comparación del mismo partido entre años) MUST recibir una explicación clara y honesta, nunca una respuesta con cifras.
- **FR-007**: Las preguntas confusas o sin relación con las elecciones municipales de Tandil MUST recibir un mensaje de reformulación ("no entendí, reformulá").
- **FR-008**: Las preguntas sobre un año sin datos cargados MUST recibir un aviso de "sin datos para ese año".
- **FR-009**: Debajo de cada respuesta MUST mostrarse la línea "Interpreté: …" con el año, la categoría de pregunta y el cargo interpretados, para transparencia y auditoría del usuario.
- **FR-010**: El sistema MUST señalar explícitamente en un aviso de advertencia los empates entre agrupaciones y los huecos de datos (valores faltantes) relevantes en la elección consultada.
- **FR-011**: El sistema MUST interpretar "última elección" como la más reciente con datos cargados, sin un año fijo predefinido, y reflejarlo en la línea "Interpreté: …".
- **FR-012**: El sistema MUST respetar las reglas de dominio del dataset: no comparar la misma agrupación entre años distintos; reportar empates de forma explícita; tratar la regla de 1963 como ya resuelta en los datos; y no señalar como anomalía el patrón bienal normal desde 1965.
- **FR-013**: El sistema MUST mostrar estados diferenciados y claros para: pregunta en proceso (carga), error del sistema, pregunta fuera de alcance (con la explicación correspondiente), año sin datos y pregunta no comprendida.
- **FR-014**: El campo de pregunta y el flujo MUST cumplir WCAG 2.2 AA: etiqueta asociada al campo, anuncio automático del resultado y de los cambios de estado en una región de actualización dinámica, navegación por teclado y contraste adecuado.
- **FR-015**: El cuadro de pregunta MUST deshabilitarse en modo sin conexión (offline de la PWA) con un mensaje claro, sin romper el resto de la plataforma.
- **FR-016**: El sistema MUST garantizar que el usuario no puede influir en la consulta a la base de datos más allá de su pregunta en lenguaje natural, y que las credenciales de acceso a servicios externos nunca se exponen al navegador (solo se usan en el servidor).
- **FR-017**: El sistema MUST limitar la cantidad de preguntas procesadas por visitante (dirección de red) en una ventana de tiempo deslizante, sin impedir el uso normal.
- **FR-018**: El sistema MUST devolver desde una memoria temporal la respuesta ya generada a preguntas idénticas o normalizadas equivalentes, sin reprocesarlas ni volver a consultar el servicio de interpretación.
- **FR-019**: Las reglas de interpretación (vocabulario, categorías, ejemplos) MUST mantenerse en un único documento de referencia que es la fuente de verdad, del cual se construye la configuración del servicio de interpretación; cualquier cambio de reglas se hace en ese documento.
- **FR-020**: Una pregunta vacía (o solo con espacios) MUST no enviarse; se muestra una validación en el campo pidiendo que se escriba la pregunta.

### Key Entities *(include if feature involves data)*

- **Elección**: edición de una elección general local (año y fecha), con datos generales (electores habilitados, mesas, votos positivos/en blanco/nulos, total) —algunos NULL-ables en actas antiguas—. Es la unidad sobre la que se resuelven las preguntas.
- **Agrupación**: lista/partido/frente que compitió en una elección, con votos, porcentaje (no disponible antes de ~2003) y bancas precalculadas. No es un catálogo maestro: nombres y números se reciclan y cambian entre elecciones, por lo que no es comparable entre años.
- **Persona Electa**: persona electa (titular/suplente) para un cargo en una elección, asociada a su agrupación. Se usa para las preguntas de "personas electas" y "bancas".
- **Consulta (intento)**: la pregunta en lenguaje natural del usuario junto con su interpretación estructurada (año, categoría, cargo, límite, condiciones). No se persiste; es el objeto de intercambio que permite renderizar la respuesta y la línea "Interpreté: …" para auditoría.
- **Respuesta**: texto determinístico renderizado a partir de las cifras de la base, compuesto por el resultado, la advertencia (si aplica) y la interpretación ("Interpreté: …"). Las cifras siempre provienen de la base, nunca de la interpretación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 95% de las preguntas válidas de un conjunto de referencia de ~10 preguntas (que cubre las categorías de la v1) recibe una respuesta correcta y visible en menos de 5 segundos desde el envío.
- **SC-002**: El 100% de las cifras mostradas en las respuestas coincide con los valores oficiales del escrutinio definitivo almacenados en la base; ninguna cifra es generada ni calculada por el sistema.
- **SC-003**: El 100% de las preguntas del conjunto de referencia recibe una respuesta o una explicación correcta y coherente con su intención (sin respuestas fabricadas ni desviadas).
- **SC-004**: El 100% de las preguntas fuera de alcance o prohibidas recibe una explicación clara; en ningún caso se muestra una cifra inventada.
- **SC-005**: El 100% de los estados de la interfaz (carga, resultado, fuera de alcance, sin datos, error) es anunciado correctamente a lectores de pantalla, verificado con auditoría automatizada de accesibilidad (sin errores de prioridad crítica) y recorrido manual de teclado.
- **SC-006**: El 100% de los envíos reemplaza la respuesta anterior; verificable en la interfaz (nunca aparecen dos respuestas acumuladas).
- **SC-007**: El ritmo de preguntas de un usuario normal nunca es rechazado, mientras que el envío masivo desde una misma dirección se limita automáticamente.
- **SC-008**: En modo sin conexión, el cuadro de pregunta queda deshabilitado con mensaje claro y el resto de la plataforma (histórico, tablas, PDFs) continúa funcionando sin regresión.
- **SC-009**: Una pregunta repetida se responde desde la memoria temporal sin reprocesamiento, verificable en que la respuesta es idéntica y más rápida que el primer envío.
- **SC-010**: Al incorporar una elección nueva al histórico, una pregunta sobre la "última elección" pasa a resolverla automáticamente sin intervención manual ni cambio de configuración.

## Assumptions

- Idioma: español (preguntas, respuestas, mensajes de estado y la línea "Interpreté: …").
- Se reutiliza la base de datos existente y sus datos precargados (escrutinio definitivo); la función solo lee y nunca modifica la base.
- El conjunto de referencia de ~10 preguntas cubre las categorías de la v1 e incluye casos límite (empate, año sin datos, última elección, fuera de alcance).
- "Última elección" se interpreta como el año más reciente con datos; no existe un año fijo.
- Límite de ritmo por defecto: un máximo del orden de ~10 preguntas por minuto por visitante, configurable en el despliegue.
- La memoria temporal de respuestas tiene tamaño y vigencia acotados; es una optimización y nunca la fuente de verdad (la fuente es el escrutinio definitivo).
- **Decisiones de arquitectura fijadas (no cambiar)**: un solo cuadro en la portada con pregunta única (cada envío reemplaza la respuesta anterior); una única interpretación por envío mediante un servicio externo de lenguaje natural con salida estructurada y determinística (sin aleatoriedad); el intérprete nunca genera consultas a la base —el sistema tiene un catálogo fijo y extensible de categorías que se traducen a consultas predefinidas—; la respuesta final se renderiza con plantillas determinísticas en el servidor a partir de las cifras de la base; las reglas de interpretación viven en el documento de referencia (fuente de verdad) y el código lo utiliza para construir la llamada; el esquema completo de la base de datos se entrega al intérprete como contexto.
- **Seguridad (fijada)**: la clave de acceso al servicio externo vive solo en el servidor (no en el navegador ni en repositorio); la conexión a la base se realiza con un usuario de solo lectura; las consultas a la base se construyen con parámetros, sin aceptar instrucciones de consulta desde el navegador ni desde el intérprete; la limitación de ritmo y la memoria temporal viven en la instancia única del servidor.
- Dependencias: base de datos existente con datos completos del histórico; servicio externo de interpretación de lenguaje natural con credenciales de acceso server-side.
- Restricción: no se incorporan dependencias nuevas de paquetes para esta función.
- Quedan fuera de alcance en la v1: gráficos para la serie de votos por año (solo texto), historial/hilo de conversación, comparación de partidos entre años, respuestas en streaming, y datos de PASO/provinciales/nacionales.
