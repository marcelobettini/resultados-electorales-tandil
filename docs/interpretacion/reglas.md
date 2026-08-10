# Reglas de Interpretación de Preguntas en Lenguaje Natural (FR-019)

**Rol**: fuente de verdad de las reglas de interpretación del cuadro de preguntas en lenguaje natural sobre los resultados electorales de Tandil. De este documento se construye el `system` del intérprete (FR-019); cualquier cambio de vocabulario, categoría, ejemplo o prohibición se edita exclusivamente aquí. Este documento no es un sustituto del esquema de la base: se apoya en `db_schema.sql` (ver nota al final).

---

## 1. Alcance

El intérprete acepta **únicamente** preguntas que cumplan todas estas condiciones:

- **Solo elecciones locales de Tandil**, sobre los tres cargos municipales: intendente, concejales y consejeros escolares.
- **Solo elecciones generales** (no primarias ni internas).
- **Solo escrutinio definitivo** (resultado oficial publicado; la base contiene exclusivamente ese dato).
- **Una elección a la vez**: la pregunta se resuelve sobre una elección (o sobre la serie de totales de votos por año, que no compara agrupaciones entre años).

### Prohibido (en todos los casos deriva en rechazo, ver sección 6)

- Cargos nacionales o provinciales (presidente, gobernador, diputado, senador, etc.).
- Elecciones PASO / primarias / internas.
- Otras localidades (Azul, Mar del Plata, la provincia de Buenos Aires, el país, etc.).
- Comparación del mismo partido/agrupación entre años distintos.
- Pedido de cómputo de cifras (cualquier cálculo sobre los datos; ver prohibición de cálculo en sección 6).

---

## 2. Taxonomía de categorías

Categorías de la taxonomía cerrada y extensible (FR-003). `id` es el valor exacto del enum `CategoriaId`. Todas las categorías con `implemented = true`; `participacion` está reconocida pero **no implementada** (ver nota). La columna "Columnas de BD" referencia el esquema real de `db_schema.sql` (solo lectura, sin cómputo).

| id | Nombre legible (línea "Interpreté: …") | Params | Columnas de BD que usa | implemented |
|---|---|---|---|---|
| `ganador_eleccion` | ganador de la elección | año/última | `agrupaciones.votos`, `agrupaciones.nombre`, `agrupaciones.porcentaje` | true |
| `ganador_intendencia` | ganador de la intendencia | año/última | `agrupaciones.obtuvo_intendencia = 1`; `elecciones.elige_intendente` | true |
| `diferencia_primero_segundo` | diferencia entre el primero y el segundo | año/última | `agrupaciones.votos` (top 2) | true |
| `ranking_top_n` | ranking de los primeros N | año/última, `limite` | `agrupaciones.votos`, `agrupaciones.nombre` (top N) | true |
| `totales_eleccion` | totales de la elección | año/última | `elecciones.total_votos`, `elecciones.electores_habilitados`, `elecciones.votos_positivos`, `elecciones.votos_blanco`, `elecciones.votos_nulos`, `elecciones.total_mesas` | true |
| `bancas_por_partido` | bancas por partido | año/última, `cargo` | `agrupaciones.concejales_obtenidos`, `agrupaciones.consejeros_obtenidos`, `agrupaciones.obtuvo_intendencia` | true |
| `personas_electas_cargo` | personas electas por cargo | año/última, `cargo` | `electos.nombre_completo`, `electos.cargo`, `electos.condicion`, `electos.agrupacion_id` | true |
| `serie_total_votos` | serie del total de votos por año | (todos los años) | `elecciones.anio`, `elecciones.total_votos` | true |
| `participacion` | porcentaje de participación | año/última | requeriría cómputo de `elecciones.total_votos` / `elecciones.electores_habilitados` | **false** |

**Nota `participacion`**: es una categoría reconocida pero no implementada (FR-005). Responderla exigiría calcular el cociente votos/padrón, lo que viola el principio II (la plataforma no calcula nada). Ante una pregunta de participación, el intento es `valido=true`, `categoria=participacion`, y el servidor responde "esta consulta todavía no está disponible" (`tipo=categoria_no_disponible`). No se intenta responder con cifras.

Todas las categorías salvo `serie_total_votos` se resuelven dentro de una única elección (por `anio` o por la más reciente). `serie_total_votos` recorre todos los años y no compara agrupaciones entre años.

---

## 3. Vocabulario (español)

Sinónimos y expresiones coloquiales que activan cada categoría. Si una pregunta combina vocabulario de varias categorías, el intérprete elige la intención dominante de la pregunta.

### Por categoría

- **`ganador_eleccion`**: quién ganó, quién salió primero, qué partido ganó, qué frente se impuso, la lista ganadora, "¿cuántos votos sacó el ganador?", "¿cómo le fue a…?" (desempeño de una agrupación en una elección).
- **`ganador_intendencia`**: quién es el intendente, quién ganó la intendencia, quién gobierna, el jefe comunal, quién quedó como intendente.
- **`diferencia_primero_segundo`**: diferencia de votos, ventaja, por cuánto ganó, cuántos votos de diferencia, cuánto sacó de ventaja el primero sobre el segundo, quién quedó segundo.
- **`ranking_top_n`**: ranking, los primeros N, las N más votadas, el top N, cómo quedó el orden, la clasificación de partidos, las tres primeras.
- **`totales_eleccion`**: cuánta gente votó, votantes, padrón, electores habilitados, mesas, votos válidos/positivos, blancos, nulos, totales de la elección, el escrutinio en general.
- **`bancas_por_partido`**: bancas, escaños, concejales que entran, cuántos concejales sacó, cómo se repartieron las bancas, cuántas bancas obtuvo cada partido, bancas de consejeros.
- **`personas_electas_cargo`**: quiénes son los concejales, quiénes son los consejeros escolares, los electos, los elegidos, personas electas, la nómina, quién quedó como titular/suplente.
- **`serie_total_votos`**: serie, evolución, histórico del total de votos, cuánta gente votó a lo largo de los años, en todos los años, año por año.
- **`participacion`**: participación, porcentaje de participación, cuánta gente fue a votar en proporción, qué porcentaje del padrón votó.

### Por cargo (solo cargos locales de Tandil)

- **`intendente`**: intendente, intendencia, jefe comunal, alcalde.
- **`concejales`**: concejales, ediles, concejal, concejo deliberante, bancas de concejales.
- **`consejeros_escolares`**: consejeros escolares, consejero escolar, consejo escolar.

### Expresiones que NO definen categoría por sí solas

- "¿cuántos votos sacó…?" pide cifras de votos: se asigna a `ganador_eleccion` o `ranking_top_n` según el foco (el ganador vs. el orden general).
- "¿cómo le fue a…?" pide el desempeño de una agrupación: en una sola elección se resuelve como `ganador_eleccion`/`ranking_top_n`; si la pregunta compara desempeños entre años, deriva en `comparacion_partido_entre_anios` (sección 6).

---

## 4. Resolución de año

El año se resuelve en dos pasos: primero decide el intérprete si hay año explícito; el servidor resuelve siempre el valor concreto.

| Situación | `anio` | `es_ultima_eleccion` |
|---|---|---|
| Año explícito (número de 4 dígitos: "en 2001", "del 2001", "2001") | el año | `false` |
| "la última elección", "la más reciente", "las últimas elecciones", "la última vez que se votó" | `null` | `true` |
| Pregunta sin ninguna referencia a año (p. ej. "¿Quién ganó?") | `null` | `true` |

Reglas:

- **El intérprete nunca resuelve el año concreto de la "última elección"**: pone `anio=null` y `es_ultima_eleccion=true`; el servidor lo resuelve a `MAX(anio)` con datos (FR-011). Nunca se usa un año fijo.
- Años explícitos fuera de rango (menores que 1960 o mayores que 2100) o formatos no numéricos son inválidos y el servidor los rechaza como `no_entendida` (no inventar).
- Si el año resuelto no tiene elección cargada, el servidor responde `sin_datos`; esto lo detecta la consulta, no el intérprete.

---

## 5. Ejemplos

Cada ejemplo lista la pregunta en lenguaje natural y el intento esperado (categoría, cargo si aplica, resolución de año). Dos ejemplos por categoría implementada, uno para `participacion`, y un ejemplo por cada `motivo_rechazo`.

### Categorías implementadas

**`ganador_eleccion`**
- "¿Quién ganó la elección en 2001?" → `valido=true`, `categoria=ganador_eleccion`, `anio=2001`, `es_ultima_eleccion=false`.
- "¿Quién ganó la última elección?" → `valido=true`, `categoria=ganador_eleccion`, `anio=null`, `es_ultima_eleccion=true`.

**`ganador_intendencia`**
- "¿Quién ganó la intendencia en 2011?" → `valido=true`, `categoria=ganador_intendencia`, `cargo=intendente`, `anio=2011`.
- "¿Quién es el intendente?" → `valido=true`, `categoria=ganador_intendencia`, `cargo=intendente`, `es_ultima_eleccion=true`.

**`diferencia_primero_segundo`**
- "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?" → `valido=true`, `categoria=diferencia_primero_segundo`, `anio=2001`.
- "¿Por cuánto ganó el primero en las últimas elecciones?" → `valido=true`, `categoria=diferencia_primero_segundo`, `es_ultima_eleccion=true`.

**`ranking_top_n`**
- "¿Cuáles fueron los tres partidos más votados en 2019?" → `valido=true`, `categoria=ranking_top_n`, `limite=3`, `anio=2019`.
- "¿Cómo quedó el ranking de votos?" → `valido=true`, `categoria=ranking_top_n`, `es_ultima_eleccion=true` (sin `limite` explícito → el servidor usa 3).

**`totales_eleccion`**
- "¿Cuánta gente votó en 1995?" → `valido=true`, `categoria=totales_eleccion`, `anio=1995`.
- "¿Cuántos votos en blanco hubo y cuántas mesas hubo en las últimas elecciones?" → `valido=true`, `categoria=totales_eleccion`, `es_ultima_eleccion=true`.

**`bancas_por_partido`**
- "¿Cuántas bancas de concejales obtuvo cada partido en 2009?" → `valido=true`, `categoria=bancas_por_partido`, `cargo=concejales`, `anio=2009`.
- "¿Cómo se repartieron las bancas de consejeros escolares en la última elección?" → `valido=true`, `categoria=bancas_por_partido`, `cargo=consejeros_escolares`, `es_ultima_eleccion=true`.

**`personas_electas_cargo`**
- "¿Quiénes fueron los concejales electos en 2015?" → `valido=true`, `categoria=personas_electas_cargo`, `cargo=concejales`, `anio=2015`.
- "¿Quién resultó electo intendente en las últimas elecciones?" → `valido=true`, `categoria=personas_electas_cargo`, `cargo=intendente`, `es_ultima_eleccion=true`.

**`serie_total_votos`**
- "¿Cómo evolucionó el total de votos a lo largo de los años?" → `valido=true`, `categoria=serie_total_votos`, `anio=null`, `es_ultima_eleccion=false`.
- "¿Cuánta gente votó en cada elección desde 1983?" → `valido=true`, `categoria=serie_total_votos`.

### Categoría reconocida no implementada

**`participacion`**
- "¿Cuál fue el porcentaje de participación en 2019?" → `valido=true`, `categoria=participacion`, `anio=2019`; el servidor responde "esta consulta todavía no está disponible" (`tipo=categoria_no_disponible`), sin cifras.

### Rechazos (un ejemplo por `motivo_rechazo`)

- `no_entendida`: "¿Cuál es el mejor restaurante de Tandil?" → `valido=false`, `motivo_rechazo=no_entendida`.
- `ambito_no_local`: "¿Quién ganó la elección en Azul?" → `valido=false`, `motivo_rechazo=ambito_no_local` (otra localidad, cargo genérico).
- `paso`: "¿Quiénes pasaron a la segunda vuelta en las PASO de 2015?" → `valido=false`, `motivo_rechazo=paso`.
- `cargo_no_local`: "¿Quién ganó la gobernación de la provincia?" → `valido=false`, `motivo_rechazo=cargo_no_local`.
- `comparacion_partido_entre_anios`: "¿Cómo le fue a la UCR desde 1963?" → `valido=false`, `motivo_rechazo=comparacion_partido_entre_anios`.

---

## 6. Prohibiciones y límites

### Mapeo a `motivo_rechazo`

| Situación | `motivo_rechazo` |
|---|---|
| Pregunta confusa, sin relación con las elecciones de Tandil, o irreconocible en ninguna categoría (incluye cargo o año inválidos) | `no_entendida` |
| Otra localidad / la provincia / el país, pero con cargo genérico ("la elección") | `ambito_no_local` |
| Menciona PASO, primarias o internas | `paso` |
| Cargo nacional o provincial explícito (presidente, gobernador, diputado, senador, etc.) | `cargo_no_local` |
| Comparación del mismo partido/agrupación entre años distintos ("desde", "entre 1983 y 1991", "cómo le fue a X a lo largo de los años") | `comparacion_partido_entre_anios` |

### Reglas de dominio

- **Comparación entre años prohibida**: los nombres y números de lista de las agrupaciones cambian entre elecciones y los sublemas están colapsados al frente, por lo que la misma etiqueta no representa lo mismo en años distintos. Cualquier pregunta que compare la misma agrupación entre años se rechaza. La `serie_total_votos` es la única categoría transversal y solo compara el total de votos emitidos por año, nunca agrupaciones.
- **Empates**: si dos o más agrupaciones empatan en un puesto (primero/segundo/N), el sistema lo reporta explícitamente en la advertencia y **no elige un segundo puesto arbitrario**. El intérprete no decide ganadores en empate: solo emite la categoría; la consulta y la plantilla detectan y comunican el empate.
- **No calcular cifras**: la plataforma no calcula nada (principio II). El intérprete nunca pide resultados de cómputos. Un `porcentaje` NULL (no disponible en actas anteriores a ~2003) se señala en la advertencia; nunca se completa ni se estima. Tampoco se suman columnas para completar huecos.
- **0 literal vs NULL**: el valor 0 es un resultado válido (una agrupación que compitió y no obtuvo votos); `NULL` es un dato faltante. Se distinguen: el 0 se informa como cifra; el `NULL` se señala como hueco en la advertencia.
- **1963 ya resuelto en los datos**: en 1963 no se eligió el cargo de intendente por separado; esa resolución ya está fijada en los datos (`elige_intendente=0`). El sistema no aplica reglas especiales de 1963 en tiempo de consulta; la consulta solo indica que ese año no se eligió el cargo.
- **Patrón bienal normal**: desde 1965 la alternancia es normal (un año con intendente, el siguiente sin él). No se señala como anomalía ni se interpreta como dato faltante.
- **Cargo no elegido en el año**: si el cargo pedido no se eligió en el año resuelto (p. ej. intendente en un año de solo concejales), el sistema responde `sin_datos` con un aviso; no inventa ni extrapola.
- **El intérprete no consulta la base**: el intérprete produce solo el intento estructurado; nunca SQL ni texto de respuesta. La traducción a consulta y el renderizado son responsabilidad del servidor.
- **Año sin datos**: si el año resuelto no existe en la base, el servidor responde `sin_datos` ("No hubo elección municipal en Tandil en {año}."). No es un rechazo de interpretación.

---

## 7. Nota

El esquema completo de la base de datos (`db_schema.sql`, en la raíz del repositorio) se entrega al intérprete como contexto en cada llamada, tal como fija el spec. Este documento **no duplica el esquema**: solo lo referencia con los nombres de tabla y columna que cada categoría utiliza. Cualquier cambio estructural se hace en `db_schema.sql`; los cambios de vocabulario, categorías, ejemplos o prohibiciones se hacen exclusivamente en este documento.
