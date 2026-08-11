# Reglas de Interpretación de Preguntas en Lenguaje Natural (FR-019)

**Rol**: fuente de verdad de las reglas de interpretación del cuadro de preguntas en lenguaje natural sobre los resultados electorales de Tandil. De este documento se construye el `system` del intérprete (FR-019); cualquier cambio de vocabulario, categoría, ejemplo o prohibición se edita exclusivamente aquí. Este documento no es un sustituto del esquema de la base: se apoya en `db_schema.sql` (ver nota al final).

---

## 1. Alcance

El intérprete acepta **únicamente** preguntas que cumplan todas estas condiciones:

- **Solo elecciones locales de Tandil**, sobre los tres cargos municipales: intendente, concejales y consejeros escolares.
- **Solo elecciones generales** (no primarias ni internas).
- **Solo escrutinio definitivo** (resultado oficial publicado; la base contiene exclusivamente ese dato).
- **Una elección a la vez**: la pregunta se resuelve sobre una elección, salvo las categorías transversales `serie_total_votos`, `serie_agrupacion` e `historial_persona`, que recorren todos los años sin comparar agrupaciones entre años.

### Prohibido (en todos los casos deriva en rechazo, ver sección 6)

- Cargos nacionales o provinciales (presidente, gobernador, diputado, senador, etc.).
- Elecciones PASO / primarias / internas.
- Otras localidades (Azul, Mar del Plata, la provincia de Buenos Aires, el país, etc.).
- Comparación del mismo partido/agrupación entre años distintos.
- Pedido de cómputo de cifras (cualquier cálculo sobre los datos; ver prohibición de cálculo en sección 6).

---

## 2. Taxonomía de categorías

Categorías de la taxonomía cerrada y extensible (FR-003). `id` es el valor exacto del enum `CategoriaId`. Todas las categorías tienen `implemented = true`. La columna "Columnas de BD" referencia el esquema real de `db_schema.sql` (solo lectura; la única operación de cómputo es el cociente de participación, ver nota).

| id                           | Nombre legible (línea "Interpreté: …")    | Params                        | Columnas de BD que usa                                                                                                                                                    | implemented |
| ---------------------------- | ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `ganador_eleccion`           | ganador de la elección                    | año/última                    | `agrupaciones.votos`, `agrupaciones.nombre`, `agrupaciones.porcentaje`                                                                                                    | true        |
| `ganador_intendencia`        | ganador de la intendencia                 | año/última                    | `agrupaciones.obtuvo_intendencia = 1`; `elecciones.elige_intendente`                                                                                                      | true        |
| `diferencia_primero_segundo` | diferencia entre el primero y el segundo  | año/última                    | `agrupaciones.votos` (top 2)                                                                                                                                              | true        |
| `ranking_top_n`              | ranking de los primeros N                 | año/última, `limite`          | `agrupaciones.votos`, `agrupaciones.nombre` (top N)                                                                                                                       | true        |
| `totales_eleccion`           | totales de la elección                    | año/última                    | `elecciones.total_votos`, `elecciones.electores_habilitados`, `elecciones.votos_positivos`, `elecciones.votos_blanco`, `elecciones.votos_nulos`, `elecciones.total_mesas` | true        |
| `bancas_por_partido`         | bancas por partido                        | año/última, `cargo`           | `agrupaciones.concejales_obtenidos`, `agrupaciones.consejeros_obtenidos`, `agrupaciones.obtuvo_intendencia`                                                               | true        |
| `personas_electas_cargo`     | personas electas por cargo                | año/última, `cargo`           | `electos.nombre_completo`, `electos.cargo`, `electos.condicion`, `electos.agrupacion_id`                                                                                  | true        |
| `serie_total_votos`          | serie del total de votos por año          | (todos los años)              | `elecciones.anio`, `elecciones.total_votos`                                                                                                                               | true        |
| `votos_agrupacion`           | votos de una agrupación en un año         | año/última, `agrupacion`      | `agrupaciones.votos`, `agrupaciones.nombre`, `agrupaciones.porcentaje`                                                                                                    | true        |
| `participacion_agrupacion`   | participación de una agrupación en un año | año/última, `agrupacion`      | `agrupaciones.nombre`                                                                                                                                                     | true        |
| `serie_agrupacion`           | serie de votos de una agrupación por año  | `agrupacion`                  | `agrupaciones.votos`, `agrupaciones.nombre`, `elecciones.anio`                                                                                                            | true        |
| `historial_persona`          | historial electoral de una persona (siempre completo, por cargo) | `persona`                     | `electos.nombre_completo`, `electos.cargo`, `electos.condicion`, `elecciones.anio`                                                                                        | true        |
| `participacion`              | porcentaje de participación               | año/última                    | `elecciones.total_votos`, `elecciones.electores_habilitados` (cociente calculado)                                                                                         | true        |

Las categorías `ganador_eleccion`, `ganador_intendencia`, `diferencia_primero_segundo`, `ranking_top_n`, `totales_eleccion`, `bancas_por_partido`, `personas_electas_cargo`, `votos_agrupacion`, `participacion_agrupacion` y `participacion` se resuelven dentro de una única elección (por `anio` o por la más reciente). `serie_total_votos`, `serie_agrupacion` e `historial_persona` son transversales: recorren todos los años y nunca comparan agrupaciones entre años.

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
- **`votos_agrupacion`**: cuántos votos sacó X, los votos de X, cuánta gente votó a X, el desempeño de X en una elección (con agrupación explícita y un solo año).
- **`participacion_agrupacion`**: participó X, estuvo X, compitió X, ¿X se presentó?, ¿X formó parte de la elección? (sí/no, con agrupación explícita y un solo año).
- **`serie_agrupacion`**: en qué años participó X, cuántos votos sacó X en cada elección, evolución de los votos de X, historial de votos de X (agrupación explícita, sin año).
- **`historial_persona`**: cuántas veces fue elegido X, en qué años fue electo X, historial electoral de X, cargos en los que salió X, ¿X fue intendente/concejal? (persona puntual).
- **`participacion`**: participación, porcentaje de participación, cuánta gente fue a votar en proporción, qué porcentaje del padrón votó.

### Por cargo (solo cargos locales de Tandil)

- **`intendente`**: intendente, intendencia, jefe comunal, alcalde.
- **`concejales`**: concejales, ediles, concejal, concejo deliberante, bancas de concejales.
- **`consejeros_escolares`**: consejeros escolares, consejero escolar, consejo escolar.

### Expresiones que NO definen categoría por sí solas

- "¿cuántos votos sacó…?" pide cifras de votos: se asigna a `votos_agrupacion` si hay agrupación explícita, o a `ganador_eleccion`/`ranking_top_n` según el foco (el ganador vs. el orden general).
- "¿cómo le fue a…?" pide el desempeño de una agrupación: en una sola elección se resuelve como `votos_agrupacion`; si la pregunta compara desempeños entre años ("desde 1963", "a lo largo de los años") con juicio de valor, deriva en `comparacion_partido_entre_anios` (sección 6). `serie_agrupacion` responde la serie de votos **sin comparar ni evaluar**: solo muestra los años con datos.

---

## 4. Resolución de año

El año se resuelve en dos pasos: primero decide el intérprete si hay año explícito; el servidor resuelve siempre el valor concreto.

| Situación                                                                                      | `anio` | `es_ultima_eleccion` |
| ---------------------------------------------------------------------------------------------- | ------ | -------------------- |
| Año explícito (número de 4 dígitos: "en 2001", "del 2001", "2001")                             | el año | `false`              |
| "la última elección", "la más reciente", "las últimas elecciones", "la última vez que se votó" | `null` | `true`               |
| Pregunta sin ninguna referencia a año (p. ej. "¿Quién ganó?")                                  | `null` | `true`               |

Reglas:

- **El intérprete nunca resuelve el año concreto de la "última elección"**: pone `anio=null` y `es_ultima_eleccion=true`; el servidor lo resuelve a `MAX(anio)` con datos (FR-011). Nunca se usa un año fijo.
- Años explícitos fuera de rango (menores que 1960 o mayores que 2100) o formatos no numéricos son inválidos y el servidor los rechaza como `no_entendida` (no inventar).
- Si el año resuelto no tiene elección cargada, el servidor responde `sin_datos`; esto lo detecta la consulta, no el intérprete.

---

## 5. Ejemplos

Cada ejemplo lista la pregunta en lenguaje natural y el intento esperado (categoría, cargo si aplica, resolución de año). Dos ejemplos por categoría implementada y un ejemplo por cada `motivo_rechazo`.

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

**`votos_agrupacion`**

- "¿Cuántos votos sacó el Partido Justicialista en 2001?" → `valido=true`, `categoria=votos_agrupacion`, `agrupacion="Partido Justicialista"`, `anio=2001`.
- "¿Cuánta gente votó al Frente Renovador en la última elección?" → `valido=true`, `categoria=votos_agrupacion`, `agrupacion="Frente Renovador"`, `es_ultima_eleccion=true`.

**`participacion_agrupacion`**

- "¿Participó el Partido Justicialista en 2001?" → `valido=true`, `categoria=participacion_agrupacion`, `agrupacion="Partido Justicialista"`, `anio=2001`.
- "¿El PRO se presentó en las últimas elecciones?" → `valido=true`, `categoria=participacion_agrupacion`, `agrupacion="PRO"`, `es_ultima_eleccion=true`.

**`serie_agrupacion`**

- "¿En qué elecciones participó la Unión Cívica Radical?" → `valido=true`, `categoria=serie_agrupacion`, `agrupacion="Unión Cívica Radical"`, `anio=null` (transversal; sin año).
- "¿Cuántos votos sacó el peronismo en cada elección?" → `valido=true`, `categoria=serie_agrupacion`, `agrupacion="peronismo"`, `anio=null`.

**`historial_persona`**

- "¿En qué años fue electo Miguel Lunghi?" → `valido=true`, `categoria=historial_persona`, `persona="Miguel Lunghi"`, `cargo=null`.
- "¿Cuántas veces fue elegido Lunghi?" → `valido=true`, `categoria=historial_persona`, `persona="Lunghi"`, `cargo=null` (el servidor detecta que hay varias personas con ese apellido y pide aclaración, listando el historial completo de cada una).
- "¿Cuántas veces fue electo intendente Lunghi?" → `valido=true`, `categoria=historial_persona`, `persona="Lunghi"`, `cargo=null`.

> **`historial_persona` siempre devuelve el historial completo**: el servidor ignora `cargo` para esta categoría (se normaliza a `null`). Una persona puede haber sido electa en varios cargos (p. ej. Miguel Lunghi fue concejal en 1987 y luego intendente); la respuesta muestra el desglose por cargo (intendente, concejal y/o consejero escolar). El intérprete no elige ni infiere un cargo para esta categoría.

**`participacion`**

- "¿Cuál fue el porcentaje de participación en 2019?" → `valido=true`, `categoria=participacion`, `anio=2019`; el servidor calcula el cociente votos/padrón (única operación de cómputo del sistema).
- "¿Cuánta gente fue a votar en proporción en las últimas elecciones?" → `valido=true`, `categoria=participacion`, `es_ultima_eleccion=true`.

> **Categorías reconocidas no implementadas**: el mecanismo de FR-005 queda vigente para categorías futuras que se agreguen a la taxonomía con `implemented=false`. Hoy no hay ninguna: las 13 categorías de la taxonomía están implementadas.

### Rechazos (un ejemplo por `motivo_rechazo`)

- `no_entendida`: "¿Cuál es el mejor restaurante de Tandil?" → `valido=false`, `motivo_rechazo=no_entendida`.
- `ambito_no_local`: "¿Quién ganó la elección en Azul?" → `valido=false`, `motivo_rechazo=ambito_no_local` (otra localidad, cargo genérico).
- `paso`: "¿Quiénes pasaron a la segunda vuelta en las PASO de 2015?" → `valido=false`, `motivo_rechazo=paso`.
- `cargo_no_local`: "¿Quién ganó la gobernación de la provincia?" → `valido=false`, `motivo_rechazo=cargo_no_local`.
- `comparacion_partido_entre_anios`: "¿Cómo le fue a la UCR desde 1963?" → `valido=false`, `motivo_rechazo=comparacion_partido_entre_anios`.

---

## 6. Prohibiciones y límites

### Mapeo a `motivo_rechazo`

| Situación                                                                                                                              | `motivo_rechazo`                  |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Pregunta confusa, sin relación con las elecciones de Tandil, o irreconocible en ninguna categoría (incluye cargo o año inválidos)      | `no_entendida`                    |
| Otra localidad / la provincia / el país, pero con cargo genérico ("la elección")                                                       | `ambito_no_local`                 |
| Menciona PASO, primarias o internas                                                                                                    | `paso`                            |
| Cargo nacional o provincial explícito (presidente, gobernador, diputado, senador, etc.)                                                | `cargo_no_local`                  |
| Comparación del mismo partido/agrupación entre años distintos ("desde", "entre 1983 y 1991", "cómo le fue a X a lo largo de los años") | `comparacion_partido_entre_anios` |

### Reglas de dominio

- **Comparación entre años prohibida**: los nombres y números de lista de las agrupaciones cambian entre elecciones y los sublemas están colapsados al frente, por lo que la misma etiqueta no representa lo mismo en años distintos. Cualquier pregunta que **evalúe o compare el desempeño** de una misma agrupación entre años (con juicio de valor: "cómo le fue", "evolución del desempeño") se rechaza. Las categorías transversales (`serie_total_votos`, `serie_agrupacion`, `historial_persona`) solo **exponen los datos sin comparar ni evaluar**: el total de votos por año, la serie de votos de una agrupación y los años/cargos en los que una persona resultó electa; nunca mezclan nombres de agrupaciones entre elecciones.
- **Empates**: si dos o más agrupaciones empatan en un puesto (primero/segundo/N), el sistema lo reporta explícitamente en la advertencia y **no elige un segundo puesto arbitrario**. El intérprete no decide ganadores en empate: solo emite la categoría; la consulta y la plantilla detectan y comunican el empate.
- **0 literal vs NULL**: el valor 0 es un resultado válido (una agrupación que compitió y no obtuvo votos); `NULL` es un dato faltante. Se distinguen: el 0 se informa como cifra; el `NULL` se señala como hueco en la advertencia.
- **1963 ya resuelto en los datos**: en 1963 no se eligió el cargo de intendente por separado; esa resolución ya está fijada en los datos (`elige_intendente=0`). El sistema no aplica reglas especiales de 1963 en tiempo de consulta; la consulta solo indica que ese año no se eligió el cargo.
- **Patrón bienal normal**: desde 1965 la alternancia es normal (un año con intendente, el siguiente sin él). No se señala como anomalía ni se interpreta como dato faltante.
- **Cargo no elegido en el año**: si el cargo pedido no se eligió en el año resuelto (p. ej. intendente en un año de solo concejales), el sistema responde `sin_datos` con un aviso; no inventa ni extrapola.
- **`historial_persona` sin cargo**: para esta categoría el servidor ignora el parámetro `cargo` (lo normaliza a `null`) y siempre responde el historial completo por cargo (intendente, concejal y/o consejero escolar). En preguntas genéricas de persona ("¿cuántas veces fue elegido X?", "¿en qué años fue electo X?", "¿qué cargos tuvo X?"), el intérprete pone `cargo=null`; el cargo que la persona tuvo en la vida real no se usa para completar el intento.
- **El intérprete no consulta la base**: el intérprete produce solo el intento estructurado; nunca SQL ni texto de respuesta. La traducción a consulta y el renderizado son responsabilidad del servidor.
- **Año sin datos**: si el año resuelto no existe en la base, el servidor responde `sin_datos` ("No hubo elección municipal en Tandil en {año}."). No es un rechazo de interpretación.

---

## 7. Nota

El esquema completo de la base de datos (`db_schema.sql`, en la raíz del repositorio) se entrega al intérprete como contexto en cada llamada, tal como fija el spec. Este documento **no duplica el esquema**: solo lo referencia con los nombres de tabla y columna que cada categoría utiliza. Cualquier cambio estructural se hace en `db_schema.sql`; los cambios de vocabulario, categorías, ejemplos o prohibiciones se hacen exclusivamente en este documento.
