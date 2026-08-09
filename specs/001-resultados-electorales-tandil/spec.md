# Feature Specification: Plataforma de Resultados Electorales Locales de Tandil

**Feature Branch**: `001-resultados-electorales-tandil`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Plataforma pública para consultar los resultados oficiales de las elecciones locales de la ciudad de Tandil (Provincia de Buenos Aires, Argentina). Consulta histórica sobre el escrutinio definitivo cerrado, 1963 → actualidad."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
-->

### User Story 1 - Consultar los resultados de una elección histórica (Priority: P1)

Un ciudadano entra a la plataforma, ve la lista cronológica de elecciones desde 1963 hasta la actualidad y elige una elección. En la página de esa elección ve los datos generales (fecha, electores habilitados, votos positivos, en blanco y nulos), y por cada cargo elegido en ese año una tabla con partidos/frentes, votos, porcentaje y bancas, más las personas electas agrupadas por partido/frente.

**Why this priority**: Es el propósito central de la plataforma: consultar resultados definitivos de una elección pasada de forma clara y completa. Sin esto no hay producto.

**Independent Test**: Puede probarse de punta a punta navegando desde la lista cronológica hacia la página de una elección y verificando que se muestren los datos generales, las tablas por cargo y los electos de esa elección, con valores idénticos a los del PDF oficial de la Junta Electoral.

**Acceptance Scenarios**:

1. **Given** una plataforma con elecciones cargadas desde 1963, **When** un visitante abre la portada, **Then** ve una lista cronológica de elecciones en orden descendente o ascendente, omitiendo los años 1966–1973 y 1976–1983.
2. **Given** una elección con resultados cargados, **When** un visitante abre su página, **Then** ve los datos generales con los valores publicados por la Junta Electoral (sin recálculo) y un enlace al PDF oficial.
3. **Given** una elección en la que se eligieron solo Concejales, **When** el visitante abre la página, **Then** solo se muestra el cargo Concejales y no se muestra Intendente ni Consejeros Escolares.
4. **Given** una elección en la que se eligió Intendente, **When** el visitante abre la página, **Then** ve la tabla de partidos/frentes con votos, porcentaje y bancas de intendente, junto a las personas electas agrupadas por partido/frente.

---

### User Story 2 - Comparar partidos dentro de una misma elección (Priority: P2)

Un ciudadano compara el desempeño de los partidos/frentes en una misma elección (por ejemplo, 2023) apoyándose en la tabla y en gráficos complementarios (barras, donut y bancas). La tabla es la fuente de verdad; los gráficos son un refuerzo visual con alternativa textual.

**Why this priority**: La comparación intra-elección es el segundo valor más importante; se prohíbe explícitamente la comparación entre elecciones porque los frentes cambian de nombre y composición.

**Independent Test**: Puede probarse abriendo una elección con varios partidos y verificando que la tabla y los gráficos muestren exactamente los mismos valores precalculados, y que el donut no sea el único medio de lectura (la tabla es legible por sí sola).

**Acceptance Scenarios**:

1. **Given** una elección con 10 o más partidos/frentes, **When** un visitante consulta el cargo, **Then** la tabla muestra todos los partidos y sus datos, sin que el donut oculte o recorte ninguna fila.
2. **Given** cualquier elección, **When** un visitante consulta la página, **Then** cada gráfico tiene una alternativa textual (descripción, datos tabulares o texto equivalente) y puede comprenderse el resultado sin depender del gráfico.
3. **Given** partidos con sublemas en la base de datos, **When** un visitante consulta los resultados, **Then** los votos se muestran colapsados a nivel de frente (un solo número por frente), sin desglose por sublema.

---

### User Story 3 - Descargar el PDF oficial de una elección (Priority: P3)

Un ciudadano descarga el PDF oficial publicado por la Junta Electoral desde la página de la elección, para auditoría o consulta documental.

**Why this priority**: Refuerza la confianza en la plataforma al dar acceso directo a la fuente oficial, pero es un complemento: sin PDF la consulta tabular sigue siendo valiosa.

**Independent Test**: Puede probarse abriendo la página de una elección, pulsando el enlace del PDF y verificando que abre/descarga el documento oficial desde su URL pública externa.

**Acceptance Scenarios**:

1. **Given** una elección con PDF oficial publicado, **When** el visitante pulsa el enlace de descarga, **Then** se abre el documento desde su URL pública externa (la plataforma no aloja el archivo).
2. **Given** una elección cuya URL de PDF no está disponible, **When** el visitante consulta la página, **Then** el campo de descarga no se presenta como roto: se oculta o se muestra un estado claro de no disponibilidad.

---

### Edge Cases

- **Año sin elección de Intendente**: hay elecciones en las que solo se eligen Concejales y/o Consejeros Escolares; la página solo muestra los cargos efectivamente elegidos.
- **Huecos en el histórico**: si un dato del histórico (por ejemplo, el porcentaje de partidos en 1963) no está disponible, se muestra con guión ("—") en lugar de un valor inventado o una cifra calculada.
- **Años sin elecciones (gobiernos de facto)**: 1966–1973 y 1976–1983 se omiten por completo de la línea de tiempo.
- **10+ partidos en el donut**: el donut puede volverse ilegible; la tabla sigue siendo completa y la alternativa textual cubre el gráfico.
- **Votos en blanco y nulos**: se muestran como datos generales de la elección; no forman parte de la tabla de partidos.
- **PDF inaccesible o URL caída**: la sección de descarga muestra un estado claro de no disponibilidad sin romper el resto de la página.
- **Frentes con nombre cambiado entre elecciones**: cada elección muestra sus propios nombres; nunca se vinculan partidos entre elecciones distintas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La plataforma MUST listar las elecciones en orden cronológico (1963 → actualidad), omitiendo los años 1966–1973 y 1976–1983, sin búsqueda entre elecciones.
- **FR-002**: La plataforma MUST mostrar por elección los datos generales publicados: fecha, electores habilitados, votos positivos, votos en blanco y votos nulos, sin calcular ninguno de ellos.
- **FR-003**: La plataforma MUST mostrar, por cada cargo elegido en esa elección (Intendente, Concejales, Consejeros Escolares), una tabla de partidos/frentes con votos, porcentaje y bancas, con los valores precalculados tal como vienen publicados.
- **FR-004**: La plataforma MUST mostrar personas electas con nombre y apellido, lista (orden en la boleta) y partido/frente, agrupadas por partido/frente dentro del cargo correspondiente.
- **FR-005**: La plataforma MUST mostrar gráficos complementarios (barras, donut, bancas) por cargo, cada uno con alternativa textual; la tabla es la fuente de verdad y los gráficos no reemplazan ningún dato.
- **FR-006**: La plataforma MUST ofrecer un enlace de descarga del PDF oficial por elección, apuntando a una URL pública externa (no almacena archivos PDF).
- **FR-007**: La plataforma MUST ocultar los cargos que no se eligieron en una elección determinada.
- **FR-008**: La plataforma MUST colapsar los sublemas al frente: el frente es la unidad de votación y porcentaje; no se muestra desglose por sublema.
- **FR-009**: La plataforma MUST presentar los datos faltantes de una elección con guión ("—"), sin valores calculados ni supuestos.
- **FR-010**: La plataforma MUST publicar una elección nueva en la lista y en su página sin intervención manual sobre las páginas, una vez completada la carga de datos por el agente externo y activado el refresco de contenido correspondiente.
- **FR-011**: La plataforma MUST operar en su totalidad sin autenticación, sin registro y sin roles: 100% pública.
- **FR-012**: La plataforma MUST cumplir WCAG 2.2 AA en todas sus vistas, incluyendo navegación por teclado, contraste, estructura semántica y texto alternativo.
- **FR-013**: La plataforma MUST ser responsive y funcionar como PWA instalable; no se distribuye app nativa en tiendas.

### Key Entities *(include if feature involves data)*

- **Elección**: edición de una elección general local (año y fecha), con datos generales (electores habilitados, votos positivos/en blanco/nulos) y el PDF oficial por URL externa. Contiene los cargos que se eligieron ese año. En la línea de tiempo es la unidad de navegación.
- **Cargo**: Intendente (4 años), Concejales (2 años) o Consejeros Escolares (2 años). Se relaciona con una elección; solo se muestra si se eligió en ese año.
- **Partido/Frente**: unidad de votación y porcentaje (los sublemas se colapsan a este nivel). Tiene votos y porcentaje precalculados por elección y cargo, y bancas precalculadas.
- **Persona Electa**: persona con nombre y apellido, lista (orden en la boleta) y partido/frente, asociada a una elección y un cargo. Se agrupa por partido/frente en la vista.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un visitante llega desde la lista cronológica a los resultados de una elección determinada en 3 clics o menos.
- **SC-002**: El 100% de las elecciones del histórico (1963 → actualidad, omitiendo gobiernos de facto) es navegable desde la lista y muestra sus datos publicados.
- **SC-003**: Para cada elección publicada, el 100% de los valores mostrados (datos generales, votos, porcentajes y bancas) coincide con el PDF oficial de la Junta Electoral; cero cálculos propios en pantalla.
- **SC-004**: Una elección nueva cargada por el agente de datos se vuelve visible y navegable sin intervención manual de mantenimiento, en menos de 5 minutos desde la finalización de la carga.
- **SC-005**: El 100% de las páginas cumple WCAG 2.2 AA, verificado con auditoría automatizada y revisión manual de teclado, foco y lectores de pantalla.
- **SC-006**: El 100% de los datos de resultados es legible sin depender de los gráficos (la tabla u otra alternativa textual siempre está presente y completa).
- **SC-007**: La experiencia de consulta funciona correctamente en pantallas móviles (PWA responsive) sin pérdida de datos ni de navegación.

## Assumptions

- Idioma: español (todo el contenido de la interfaz).
- Se asume el histórico 1963 → actualidad como objetivo, pero se admite la existencia de huecos de datos en elecciones antiguas; esos campos se muestran con guión ("—") y se documentan, sin inventar valores.
- La comparación se limita a partidos dentro de una misma elección; no hay series históricas de un partido a través de los años.
- Los nombres de frentes y alianzas cambian entre elecciones; cada elección se presenta de forma independiente.
- Los PDFs oficiales tienen URL pública externa provista por el proceso de carga; la plataforma no almacena ni sirve los archivos.
- Los votos, porcentajes y bancas vienen precalculados en la base de datos y no se computan D'Hondt ni otros cálculos en la plataforma.
- El mecanismo de disparo de la revalidación (endpoint protegido vs. cron del servidor) es un detalle de implementación; el requisito funcional es que la elección nueva aparezca sin intervención manual.
- La estructura de información de la página de elección sigue la propuesta: encabezado con datos generales y botón PDF; por cargo, tabla con votos/%/bancas, gráficos y electos agrupados por frente.
- Queda fuera de alcance la carga/administración de datos, la digitalización de PDFs, la validación de los documentos y el almacenamiento de los archivos originales.
- Dependencia: la base de datos MySQL debe contener datos completos y precalculados del histórico antes de que las páginas puedan poblarse.
