-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:8889
-- Generation Time: Aug 08, 2026 at 07:49 PM
-- Server version: 8.0.35
-- PHP Version: 8.2.20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `resultados_tandil`
--

-- --------------------------------------------------------

--
-- Table structure for table `agrupaciones`
--

CREATE TABLE `agrupaciones` (
  `id` int UNSIGNED NOT NULL,
  `eleccion_id` int UNSIGNED NOT NULL,
  `numero_lista` varchar(20) DEFAULT NULL,
  `nombre` varchar(255) NOT NULL,
  `votos` int UNSIGNED DEFAULT NULL,
  `porcentaje` decimal(5,2) DEFAULT NULL COMMENT 'No disponible en actas anteriores a ~2003',
  `concejales_obtenidos` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `consejeros_obtenidos` tinyint UNSIGNED NOT NULL DEFAULT '0',
  `obtuvo_intendencia` tinyint(1) NOT NULL DEFAULT '0',
  `orden_visualizacion` smallint UNSIGNED DEFAULT NULL COMMENT 'Orden original en el acta, para mostrarlo igual'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `elecciones`
--

CREATE TABLE `elecciones` (
  `id` int UNSIGNED NOT NULL,
  `anio` smallint UNSIGNED NOT NULL,
  `fecha` date DEFAULT NULL,
  `cargos_texto` varchar(255) DEFAULT NULL COMMENT 'Texto crudo del campo ELIGE del acta, para trazabilidad',
  `elige_intendente` tinyint(1) NOT NULL DEFAULT '0',
  `cantidad_concejales` tinyint UNSIGNED DEFAULT NULL,
  `cantidad_consejeros` tinyint UNSIGNED DEFAULT NULL,
  `electores_habilitados` int UNSIGNED DEFAULT NULL,
  `total_mesas` int UNSIGNED DEFAULT NULL,
  `votos_positivos` int UNSIGNED DEFAULT NULL,
  `votos_blanco` int UNSIGNED DEFAULT NULL,
  `votos_nulos` int UNSIGNED DEFAULT NULL,
  `total_votos` int UNSIGNED DEFAULT NULL,
  `cociente_concejales` decimal(14,4) DEFAULT NULL,
  `cociente_consejeros` decimal(14,4) DEFAULT NULL,
  `notas` text COMMENT 'Resoluciones especiales: acumulación de votos entre listas, discrepancias de la fuente, etc.',
  `archivo_origen` varchar(255) NOT NULL COMMENT 'PDF del que se extrajo el dato',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `url_pdf` varchar(500) DEFAULT NULL COMMENT 'URL pública de Cloudinary para descargar/ver el PDF original de esta elección'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `electos`
--

CREATE TABLE `electos` (
  `id` int UNSIGNED NOT NULL,
  `eleccion_id` int UNSIGNED NOT NULL,
  `agrupacion_id` int UNSIGNED DEFAULT NULL,
  `cargo` enum('INTENDENTE','CONCEJAL','CONSEJERO_ESCOLAR') NOT NULL,
  `condicion` enum('TITULAR','SUPLENTE') NOT NULL,
  `orden` tinyint UNSIGNED DEFAULT NULL COMMENT 'Posición en la lista, si se puede inferir',
  `nombre_completo` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `agrupaciones`
--
ALTER TABLE `agrupaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_agrupaciones_eleccion` (`eleccion_id`);

--
-- Indexes for table `elecciones`
--
ALTER TABLE `elecciones`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_elecciones_anio` (`anio`),
  ADD KEY `idx_elecciones_anio` (`anio`);

--
-- Indexes for table `electos`
--
ALTER TABLE `electos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_electos_agrupacion` (`agrupacion_id`),
  ADD KEY `idx_electos_eleccion` (`eleccion_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `agrupaciones`
--
ALTER TABLE `agrupaciones`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `elecciones`
--
ALTER TABLE `elecciones`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `electos`
--
ALTER TABLE `electos`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `agrupaciones`
--
ALTER TABLE `agrupaciones`
  ADD CONSTRAINT `fk_agrupaciones_eleccion` FOREIGN KEY (`eleccion_id`) REFERENCES `elecciones` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `electos`
--
ALTER TABLE `electos`
  ADD CONSTRAINT `fk_electos_agrupacion` FOREIGN KEY (`agrupacion_id`) REFERENCES `agrupaciones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_electos_eleccion` FOREIGN KEY (`eleccion_id`) REFERENCES `elecciones` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
