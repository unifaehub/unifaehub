CREATE DATABASE  IF NOT EXISTS `unifae_management` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `unifae_management`;
-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: unifae_management
-- ------------------------------------------------------
-- Server version	8.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_notes`
--

DROP TABLE IF EXISTS `admin_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_by` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('OPEN','IN_PROGRESS','PAUSED','DONE','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `observations` text COLLATE utf8mb4_unicode_ci,
  `created_by_user_id` int NOT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `active` tinyint NOT NULL DEFAULT '1',
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `rejected_by_user_id` int DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_50ddaff03dd68314f9f92bbd57` (`created_by_user_id`,`created_at`),
  KEY `IDX_73b6f25d2870503a49fb4d73a2` (`status`,`created_at`),
  KEY `FK_e759760ced7e08ed3ceffe417a4` (`updated_by_user_id`),
  KEY `IDX_e08f8a607b13e541ec7d2df081` (`requested_by`,`active`),
  KEY `IDX_844b65d81e3b27d8a702e2997e` (`active`,`created_at`),
  KEY `FK_1b48c075e5d9429ae5681288656` (`approved_by_user_id`),
  KEY `FK_5bd3930c54e3b3d541d5434ca01` (`rejected_by_user_id`),
  CONSTRAINT `FK_1b48c075e5d9429ae5681288656` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_5bd3930c54e3b3d541d5434ca01` FOREIGN KEY (`rejected_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_d9bd9f87758cbf46140b14378bf` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_e759760ced7e08ed3ceffe417a4` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notes`
--

LOCK TABLES `admin_notes` WRITE;
/*!40000 ALTER TABLE `admin_notes` DISABLE KEYS */;
INSERT INTO `admin_notes` VALUES (1,'Melhorar menu de cursos','Matheus','DONE','Criar as funções necessárias',1,1,'2026-04-09 10:06:09','2026-04-09 10:05:49.541668','2026-04-09 10:06:11.000000',1,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `admin_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `apps`
--

DROP TABLE IF EXISTS `apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `apps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `apps`
--

LOCK TABLES `apps` WRITE;
/*!40000 ALTER TABLE `apps` DISABLE KEYS */;
INSERT INTO `apps` VALUES (1,'Unifae Care - Fisioterapia',1,'2026-04-09 17:27:03.580772','2026-04-09 17:27:03.580772'),(2,'Unifae Life - Medicina',0,'2026-04-09 17:27:03.591607','2026-04-11 18:00:52.000000'),(3,'Unifae Move - Educação Física',0,'2026-04-09 17:27:03.596233','2026-04-09 20:47:11.000000'),(4,'Unifae Smile - Odontologia',0,'2026-04-09 17:27:03.600869','2026-04-09 20:47:11.000000'),(5,'Unifae Business - Administração',0,'2026-04-09 17:27:03.605762','2026-04-09 20:47:12.000000'),(6,'Unifae Finance - Ciências Contábeis',0,'2026-04-09 17:27:03.610070','2026-04-09 20:47:12.000000'),(7,'Unifae Law - Direito',0,'2026-04-09 17:27:03.614163','2026-04-09 20:47:13.000000'),(8,'Unifae Assist - Enfermagem',0,'2026-04-09 17:27:03.619489','2026-04-09 20:47:15.000000'),(9,'Unifae Tech - Engenharia de Software',0,'2026-04-09 17:27:03.624403','2026-04-09 20:47:15.000000'),(10,'Unifae Engine - Engenharia Mecânica',0,'2026-04-09 17:27:03.628876','2026-04-09 20:47:16.000000'),(11,'Unifae Lab - Farmácia',0,'2026-04-09 17:27:03.634211','2026-04-09 20:47:17.000000'),(12,'Unifae Learning - Pedagogia',0,'2026-04-09 17:27:03.639520','2026-04-09 20:47:19.000000'),(13,'Unifae Mind - Psicologia',0,'2026-04-09 17:27:03.645264','2026-04-09 20:47:20.000000'),(14,'Unifae Creative - Publicidade e Propaganda',0,'2026-04-09 17:27:03.651950','2026-04-09 20:47:14.000000');
/*!40000 ALTER TABLE `apps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_82edbc5f8a1821ff01b8b9c865` (`entity`,`entity_id`),
  KEY `IDX_2f68e345c05e8166ff9deea1ab` (`user_id`,`created_at`),
  CONSTRAINT `FK_bd2726fd31b35443f2245b93ba0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'CREATE','Course','1','{\"name\": \"Fisioterapia\"}','2026-04-09 17:27:03.990335',NULL,NULL,NULL,NULL),(2,2,'UPDATE','Prescription','2','{\"status\": \"APPROVED\"}','2026-04-09 17:27:03.993266',NULL,NULL,NULL,NULL),(3,NULL,'LOGIN_FAILED','Auth','0','{\"reason\": \"demo_row\"}','2026-04-09 17:27:03.994514',NULL,NULL,NULL,NULL),(4,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 17:27:38.609481','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(5,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 17:27:38.618003','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(6,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 17:51:42.590474','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(7,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 17:51:42.601295','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(8,1,'DELETE','/api/v1/admin/menu-nodes/7','/api/v1/admin/menu-nodes/7','{\"query\": {}}','2026-04-09 18:04:44.279899','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(9,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 18:30:27.431082','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(10,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 18:30:27.439953','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(11,1,'PATCH','/api/v1/categories/4','/api/v1/categories/4','{\"query\": {}}','2026-04-09 18:31:01.903476','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(12,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 18:36:00.945912','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(13,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 18:36:00.956238','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(14,1,'PATCH','/api/v1/exercises/1','/api/v1/exercises/1','{\"query\": {}}','2026-04-09 18:40:22.933984','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(15,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 19:35:58.620443','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(16,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 19:35:58.629586','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(17,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 20:07:48.117841','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(18,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 20:07:48.126523','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(19,1,'PATCH','/api/v1/exercises/1','/api/v1/exercises/1','{\"query\": {}}','2026-04-09 20:08:17.950310','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(20,1,'PATCH','/api/v1/exercises/1','/api/v1/exercises/1','{\"query\": {}}','2026-04-09 20:08:36.330591','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(21,1,'PATCH','/api/v1/exercises/1','/api/v1/exercises/1','{\"query\": {}}','2026-04-09 20:09:10.490746','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(22,1,'PATCH','/api/v1/exercises/1','/api/v1/exercises/1','{\"query\": {}}','2026-04-09 20:15:06.477093','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(23,1,'POST','/api/v1/exercises/1/attachments','/api/v1/exercises/1/attachments','{\"query\": {}}','2026-04-09 20:15:06.520338','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(24,1,'DELETE','/api/v1/exercises/1/attachments/1','/api/v1/exercises/1/attachments/1','{\"query\": {}}','2026-04-09 20:18:42.895024','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(25,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 20:41:53.519342','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(26,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 20:41:53.530030','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(27,1,'PATCH','/api/v1/courses/2','/api/v1/courses/2','{\"query\": {}}','2026-04-09 20:45:28.851114','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(28,1,'PATCH','/api/v1/courses/3','/api/v1/courses/3','{\"query\": {}}','2026-04-09 20:45:31.329316','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(29,1,'PATCH','/api/v1/courses/4','/api/v1/courses/4','{\"query\": {}}','2026-04-09 20:45:31.988948','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(30,1,'PATCH','/api/v1/courses/6','/api/v1/courses/6','{\"query\": {}}','2026-04-09 20:45:33.103324','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(31,1,'PATCH','/api/v1/courses/5','/api/v1/courses/5','{\"query\": {}}','2026-04-09 20:45:35.692291','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(32,1,'PATCH','/api/v1/courses/11','/api/v1/courses/11','{\"query\": {}}','2026-04-09 20:45:37.290293','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(33,1,'PATCH','/api/v1/courses/8','/api/v1/courses/8','{\"query\": {}}','2026-04-09 20:45:39.158696','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(34,1,'PATCH','/api/v1/courses/9','/api/v1/courses/9','{\"query\": {}}','2026-04-09 20:45:41.066896','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(35,1,'PATCH','/api/v1/courses/7','/api/v1/courses/7','{\"query\": {}}','2026-04-09 20:45:42.675435','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(36,1,'PATCH','/api/v1/courses/10','/api/v1/courses/10','{\"query\": {}}','2026-04-09 20:45:44.275592','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(37,1,'PATCH','/api/v1/courses/14','/api/v1/courses/14','{\"query\": {}}','2026-04-09 20:45:46.180324','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(38,1,'PATCH','/api/v1/courses/13','/api/v1/courses/13','{\"query\": {}}','2026-04-09 20:45:47.765334','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(39,1,'PATCH','/api/v1/courses/12','/api/v1/courses/12','{\"query\": {}}','2026-04-09 20:45:49.116701','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(40,1,'PATCH','/api/v1/apps/2','/api/v1/apps/2','{\"query\": {}}','2026-04-09 20:47:10.393918','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(41,1,'PATCH','/api/v1/apps/3','/api/v1/apps/3','{\"query\": {}}','2026-04-09 20:47:11.185437','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(42,1,'PATCH','/api/v1/apps/4','/api/v1/apps/4','{\"query\": {}}','2026-04-09 20:47:11.712996','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(43,1,'PATCH','/api/v1/apps/5','/api/v1/apps/5','{\"query\": {}}','2026-04-09 20:47:12.209370','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(44,1,'PATCH','/api/v1/apps/6','/api/v1/apps/6','{\"query\": {}}','2026-04-09 20:47:12.685690','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(45,1,'PATCH','/api/v1/apps/7','/api/v1/apps/7','{\"query\": {}}','2026-04-09 20:47:13.274849','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(46,1,'PATCH','/api/v1/apps/14','/api/v1/apps/14','{\"query\": {}}','2026-04-09 20:47:14.538826','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(47,1,'PATCH','/api/v1/apps/9','/api/v1/apps/9','{\"query\": {}}','2026-04-09 20:47:15.085330','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(48,1,'PATCH','/api/v1/apps/8','/api/v1/apps/8','{\"query\": {}}','2026-04-09 20:47:15.694831','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(49,1,'PATCH','/api/v1/apps/10','/api/v1/apps/10','{\"query\": {}}','2026-04-09 20:47:16.777241','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(50,1,'PATCH','/api/v1/apps/11','/api/v1/apps/11','{\"query\": {}}','2026-04-09 20:47:17.973287','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(51,1,'PATCH','/api/v1/apps/12','/api/v1/apps/12','{\"query\": {}}','2026-04-09 20:47:19.106082','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(52,1,'PATCH','/api/v1/apps/13','/api/v1/apps/13','{\"query\": {}}','2026-04-09 20:47:20.141470','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(53,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 22:10:28.181536','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(54,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 22:10:28.190101','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(55,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 22:42:55.538765','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(56,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 22:42:55.547385','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(57,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-09 23:46:21.519591','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(58,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-09 23:46:21.530713','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(59,1,'PRESCRIPTION_CREATE','Prescription','4','{\"items\": 2, \"patientId\": 2}','2026-04-09 23:55:02.305520','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(60,1,'POST','/api/v1/prescriptions','/api/v1/prescriptions','{\"query\": {}}','2026-04-09 23:55:02.319420','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(61,1,'PATCH','/api/v1/exercises/2','/api/v1/exercises/2','{\"query\": {}}','2026-04-09 23:57:40.719069','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(62,1,'PATCH','/api/v1/exercises/2','/api/v1/exercises/2','{\"query\": {}}','2026-04-09 23:58:07.209191','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(63,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 00:04:43.705703','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(64,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 00:04:43.714360','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(65,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 00:31:41.196390','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(66,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 00:31:41.204557','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(67,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 00:48:23.199211','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(68,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 00:48:23.208318','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(69,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 01:17:45.262852','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(70,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 01:17:45.272384','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(71,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 18:00:10.814942','::1',NULL,NULL,'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.2364'),(72,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 18:00:10.827159','::1',NULL,NULL,'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.2364'),(73,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 18:00:15.854661','::1',NULL,NULL,'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.2364'),(74,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 18:00:15.861257','::1',NULL,NULL,'Mozilla/5.0 (Windows NT; Windows NT 10.0; pt-BR) WindowsPowerShell/5.1.19041.2364'),(75,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 18:00:59.111722','::ffff:127.0.0.1',NULL,NULL,NULL),(76,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 18:00:59.120394','::ffff:127.0.0.1',NULL,NULL,NULL),(77,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 18:01:34.833519','::ffff:127.0.0.1','simulador-curl-001','Curl CLI',NULL),(78,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 18:01:34.838298','::ffff:127.0.0.1','simulador-curl-001','Curl CLI',NULL),(79,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 18:34:11.911459','::ffff:127.0.0.1','simulador-curl-001','Curl CLI',NULL),(80,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 18:34:11.929723','::ffff:127.0.0.1','simulador-curl-001','Curl CLI',NULL),(81,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-10 19:49:17.378193','::ffff:127.0.0.1',NULL,NULL,NULL),(82,6,'PASSWORD_RESET_REQUEST','auth','6','{\"mailConfigured\": true}','2026-04-10 19:51:10.214531','::ffff:127.0.0.1',NULL,NULL,NULL),(83,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-10 19:51:10.221841','::ffff:127.0.0.1',NULL,NULL,NULL),(84,6,'PASSWORD_RESET_REQUEST','auth','6','{\"mailConfigured\": true}','2026-04-10 20:03:22.860529','::ffff:127.0.0.1',NULL,NULL,NULL),(85,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-10 20:03:22.870988','::ffff:127.0.0.1',NULL,NULL,NULL),(86,6,'PASSWORD_RESET_REQUEST','auth','6','{\"mailConfigured\": true}','2026-04-10 20:08:01.037813','::ffff:127.0.0.1',NULL,NULL,NULL),(87,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-10 20:08:01.054813','::ffff:127.0.0.1',NULL,NULL,NULL),(88,6,'PASSWORD_RESET_COMPLETE','auth','6',NULL,'2026-04-10 20:12:58.155287','::ffff:127.0.0.1',NULL,NULL,NULL),(89,NULL,'POST','/api/v1/auth/reset-password','/api/v1/auth/reset-password','{\"query\": {}}','2026-04-10 20:12:58.161198','::ffff:127.0.0.1',NULL,NULL,NULL),(90,6,'PASSWORD_RESET_REQUEST','auth','6','{\"mailConfigured\": true}','2026-04-10 20:18:12.869850','::ffff:127.0.0.1',NULL,NULL,NULL),(91,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-10 20:18:12.882209','::ffff:127.0.0.1',NULL,NULL,NULL),(92,6,'PASSWORD_RESET_COMPLETE','auth','6',NULL,'2026-04-10 20:18:54.845488','::ffff:127.0.0.1',NULL,NULL,NULL),(93,NULL,'POST','/api/v1/auth/reset-password','/api/v1/auth/reset-password','{\"query\": {}}','2026-04-10 20:18:54.851055','::ffff:127.0.0.1',NULL,NULL,NULL),(94,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 20:47:57.565778','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(95,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 20:47:57.574191','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(96,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 20:51:35.389605','::ffff:127.0.0.1',NULL,NULL,NULL),(97,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 20:51:35.402905','::ffff:127.0.0.1',NULL,NULL,NULL),(98,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 20:51:42.866217','::ffff:127.0.0.1',NULL,NULL,NULL),(99,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 20:51:42.887697','::ffff:127.0.0.1',NULL,NULL,NULL),(100,5,'CONSENT_ACCEPT','consent_term','1','{\"version\": \"1.0\", \"courseId\": 1}','2026-04-10 21:02:02.312066','::ffff:127.0.0.1',NULL,NULL,NULL),(101,5,'POST','/api/v1/auth/consent/accept','/api/v1/auth/consent/accept','{\"query\": {}}','2026-04-10 21:02:02.319174','::ffff:127.0.0.1',NULL,NULL,NULL),(102,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 21:02:08.476516','::ffff:127.0.0.1',NULL,NULL,NULL),(103,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 21:02:08.490220','::ffff:127.0.0.1',NULL,NULL,NULL),(104,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 21:02:40.535946','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(105,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 21:02:40.541877','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(106,1,'CONSENT_TERM_UPDATE','consent_term','1','{\"patch\": {\"active\": false}, \"courseId\": 1}','2026-04-10 21:02:51.715350','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(107,1,'PATCH','/api/v1/courses/1/consent-terms/1','/api/v1/courses/1/consent-terms/1','{\"query\": {}}','2026-04-10 21:02:51.723611','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(108,1,'CONSENT_TERM_UPDATE','consent_term','2','{\"patch\": {\"active\": true}, \"courseId\": 1}','2026-04-10 21:02:54.924438','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(109,1,'PATCH','/api/v1/courses/1/consent-terms/2','/api/v1/courses/1/consent-terms/2','{\"query\": {}}','2026-04-10 21:02:54.932524','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(110,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 21:03:02.542210','::ffff:127.0.0.1',NULL,NULL,NULL),(111,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 21:03:02.553336','::ffff:127.0.0.1',NULL,NULL,NULL),(112,5,'CONSENT_ACCEPT','consent_term','2','{\"version\": \"0.9\", \"courseId\": 1}','2026-04-10 21:04:53.288828','::ffff:127.0.0.1',NULL,NULL,NULL),(113,5,'POST','/api/v1/auth/consent/accept','/api/v1/auth/consent/accept','{\"query\": {}}','2026-04-10 21:04:53.358770','::ffff:127.0.0.1',NULL,NULL,NULL),(114,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-10 21:04:57.997733','::ffff:127.0.0.1',NULL,NULL,NULL),(115,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 21:04:58.006054','::ffff:127.0.0.1',NULL,NULL,NULL),(116,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 21:55:09.301906','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(117,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 21:55:09.317436','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(118,1,'CONSENT_TERM_CREATE','consent_term','3','{\"active\": false, \"version\": \"1.0\", \"courseId\": 1}','2026-04-10 21:55:39.883047','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(119,1,'POST','/api/v1/courses/1/consent-terms','/api/v1/courses/1/consent-terms','{\"query\": {}}','2026-04-10 21:55:39.891430','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(120,1,'CONSENT_TERM_CREATE','consent_term','4','{\"active\": false, \"version\": \"0.10\", \"courseId\": 1}','2026-04-10 22:00:27.372205','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(121,1,'POST','/api/v1/courses/1/consent-terms','/api/v1/courses/1/consent-terms','{\"query\": {}}','2026-04-10 22:00:27.380955','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(122,1,'CONSENT_TERM_CREATE','consent_term','5','{\"active\": false, \"version\": \"0.11\", \"courseId\": 1}','2026-04-10 22:00:39.646344','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(123,1,'POST','/api/v1/courses/1/consent-terms','/api/v1/courses/1/consent-terms','{\"query\": {}}','2026-04-10 22:00:39.653643','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(124,1,'CONSENT_TERM_CREATE','consent_term','6','{\"active\": false, \"version\": \"0.10\", \"courseId\": 1}','2026-04-10 22:01:57.245815','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(125,1,'POST','/api/v1/courses/1/consent-terms','/api/v1/courses/1/consent-terms','{\"query\": {}}','2026-04-10 22:01:57.253160','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(126,1,'CONSENT_TERM_CREATE','consent_term','7','{\"active\": false, \"version\": \"0.11\", \"courseId\": 1}','2026-04-10 22:02:25.383531','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(127,1,'POST','/api/v1/courses/1/consent-terms','/api/v1/courses/1/consent-terms','{\"query\": {}}','2026-04-10 22:02:25.391926','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(128,1,'CONSENT_TERM_UPDATE','consent_term','1','{\"patch\": {\"active\": true}, \"courseId\": 1}','2026-04-10 22:08:28.973878','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(129,1,'PATCH','/api/v1/courses/1/consent-terms/1','/api/v1/courses/1/consent-terms/1','{\"query\": {}}','2026-04-10 22:08:28.986027','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(130,1,'CONSENT_TERM_UPDATE','consent_term','2','{\"patch\": {\"active\": true}, \"courseId\": 1}','2026-04-10 22:08:37.640886','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(131,1,'PATCH','/api/v1/courses/1/consent-terms/2','/api/v1/courses/1/consent-terms/2','{\"query\": {}}','2026-04-10 22:08:37.648626','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(132,1,'PATCH','/api/v1/admin/menu-nodes/2','/api/v1/admin/menu-nodes/2','{\"query\": {}}','2026-04-10 22:09:48.637663','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(133,1,'PATCH','/api/v1/admin/menu-nodes/3','/api/v1/admin/menu-nodes/3','{\"query\": {}}','2026-04-10 22:09:51.542213','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(134,1,'PATCH','/api/v1/admin/menu-nodes/4','/api/v1/admin/menu-nodes/4','{\"query\": {}}','2026-04-10 22:09:54.635170','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(135,1,'PATCH','/api/v1/admin/menu-nodes/5','/api/v1/admin/menu-nodes/5','{\"query\": {}}','2026-04-10 22:09:57.442145','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(136,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 22:15:23.213505','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(137,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 22:15:23.224470','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(138,2,'LOGIN','auth','2','{\"accessMode\": \"APP\"}','2026-04-10 22:18:52.393778','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(139,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 22:18:52.410579','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(140,4,'LOGIN','auth','4','{\"accessMode\": \"APP\"}','2026-04-10 22:19:32.965639','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(141,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 22:19:32.972096','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(142,4,'LOGIN','auth','4','{\"accessMode\": \"APP\"}','2026-04-10 22:24:02.495001','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(143,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 22:24:02.507155','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(144,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 22:45:00.840782','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(145,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 22:45:00.849883','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'),(146,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-10 23:39:09.115982','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(147,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-10 23:39:09.125442','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(148,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 00:01:00.768212','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(149,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 00:01:00.776576','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(150,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 00:37:24.552449','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(151,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 00:37:24.560659','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(152,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 00:56:11.477330','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(153,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 00:56:11.481636','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(154,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 12:01:39.861381','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(155,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 12:01:39.872407','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(156,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 12:21:04.181607','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(157,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 12:21:04.192853','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(158,1,'PATIENT_TRIAGE_CREATE','PatientAssessment','1','{\"patientId\": 2, \"riskLevel\": \"GREEN\"}','2026-04-11 12:26:55.611499','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(159,1,'POST','/api/v1/patients/2/triage','/api/v1/patients/2/triage','{\"query\": {}}','2026-04-11 12:26:55.616279','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(160,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 12:37:31.404541','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(161,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 12:37:31.413466','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(162,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 12:41:45.035113','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(163,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 12:41:45.045952','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(164,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 13:03:51.012894','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(165,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 13:03:51.021963','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(166,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 13:45:59.317413','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(167,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 13:45:59.327677','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(168,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 15:03:16.733937','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(169,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 15:03:16.742930','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(170,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 16:59:46.710722','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(171,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 16:59:46.736033','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(172,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 17:22:51.732395','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(173,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 17:22:51.800932','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(174,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 17:29:21.423156','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(175,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 17:29:21.433455','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(176,1,'PATCH','/api/v1/courses/2','/api/v1/courses/2','{\"query\": {}}','2026-04-11 17:29:40.509569','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(177,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 17:29:55.363153','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(178,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 17:29:55.368926','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(179,1,'PATCH','/api/v1/apps/2','/api/v1/apps/2','{\"query\": {}}','2026-04-11 17:30:00.366028','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(180,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 17:30:12.999289','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(181,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 17:30:13.017846','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(182,1,'PATCH','/api/v1/apps/2','/api/v1/apps/2','{\"query\": {}}','2026-04-11 17:31:38.080416','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(183,1,'PATCH','/api/v1/courses/2','/api/v1/courses/2','{\"query\": {}}','2026-04-11 17:31:42.274497','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(184,1,'POST','/api/v1/admin/menu-nodes','/api/v1/admin/menu-nodes','{\"query\": {}}','2026-04-11 17:38:29.847883','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(185,1,'PATCH','/api/v1/admin/menu-nodes/9','/api/v1/admin/menu-nodes/9','{\"query\": {}}','2026-04-11 17:38:55.296742','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(186,1,'PATCH','/api/v1/admin/menu-nodes/9','/api/v1/admin/menu-nodes/9','{\"query\": {}}','2026-04-11 17:39:29.772224','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(187,1,'PUT','/api/v1/admin/courses/1/menu-links','/api/v1/admin/courses/1/menu-links','{\"query\": {}}','2026-04-11 17:39:46.660699','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(188,1,'PUT','/api/v1/admin/courses/1/menu-links','/api/v1/admin/courses/1/menu-links','{\"query\": {}}','2026-04-11 17:40:08.639122','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(189,1,'DELETE','/api/v1/admin/menu-nodes/9','/api/v1/admin/menu-nodes/9','{\"query\": {}}','2026-04-11 17:40:13.024424','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(190,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-11 17:46:46.234288','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(191,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 17:46:46.250283','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(192,1,'PATCH','/api/v1/courses/2','/api/v1/courses/2','{\"query\": {}}','2026-04-11 17:55:47.065549','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(193,1,'PUT','/api/v1/admin/courses/2/menu-links','/api/v1/admin/courses/2/menu-links','{\"query\": {}}','2026-04-11 17:56:05.565364','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(194,1,'PUT','/api/v1/admin/courses/2/menu-links','/api/v1/admin/courses/2/menu-links','{\"query\": {}}','2026-04-11 17:56:39.105641','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(195,6,'PASSWORD_RESET_REQUEST','auth','6','{\"codeExpiresAt\": \"2026-04-11T21:59:19.823Z\", \"resetTokenRowId\": 5, \"emailSentViaSmtp\": true}','2026-04-11 17:59:24.864171','::ffff:127.0.0.1',NULL,NULL,NULL),(196,NULL,'POST','/api/v1/auth/forgot-password','/api/v1/auth/forgot-password','{\"query\": {}}','2026-04-11 17:59:24.873140','::ffff:127.0.0.1',NULL,NULL,NULL),(197,1,'PATCH','/api/v1/courses/2','/api/v1/courses/2','{\"query\": {}}','2026-04-11 18:00:52.175620','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(198,4,'LOGIN','auth','4','{\"accessMode\": \"APP\"}','2026-04-11 18:03:05.909993','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(199,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 18:03:05.918965','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(200,4,'PATIENT_CREATE','Patient','3','{\"email\": \"fernandoueno2@outlook.com\", \"courseId\": 1, \"studentId\": 4}','2026-04-11 18:03:32.549119','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(201,4,'POST','/api/v1/patients','/api/v1/patients','{\"query\": {}}','2026-04-11 18:03:32.558879','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(202,4,'PATIENT_TRIAGE_CREATE','PatientAssessment','2','{\"patientId\": 3, \"riskLevel\": \"GREEN\"}','2026-04-11 18:03:56.543100','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(203,4,'POST','/api/v1/patients/3/triage','/api/v1/patients/3/triage','{\"query\": {}}','2026-04-11 18:03:56.547309','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(204,4,'PRESCRIPTION_CREATE','Prescription','41','{\"items\": 1, \"patientId\": 3}','2026-04-11 18:04:58.711879','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(205,4,'POST','/api/v1/prescriptions','/api/v1/prescriptions','{\"query\": {}}','2026-04-11 18:04:58.726480','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(206,2,'LOGIN','auth','2','{\"accessMode\": \"APP\"}','2026-04-11 18:06:01.463437','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(207,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-11 18:06:01.470990','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(208,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-13 18:01:31.517341','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(209,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-13 18:01:31.584671','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(210,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-14 20:53:40.729935','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(211,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-14 20:53:41.140261','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(212,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-14 22:09:34.397208','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(213,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-14 22:09:34.545056','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(214,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-14 22:25:53.346829','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(215,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-14 22:25:53.363191','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(216,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-15 09:50:56.429039','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(217,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-15 09:50:56.803284','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(218,2,'LOGIN','auth','2','{\"accessMode\": \"APP\"}','2026-04-15 10:00:20.122862','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(219,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-15 10:00:20.141151','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(220,1,'LOGIN','auth','1','{\"accessMode\": \"APP\"}','2026-04-26 15:43:34.702866','::1','mnrw4zea_n6pq9smeyp','platform:Win32 | lang:en-US | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36'),(221,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 15:43:34.733994','::1','mnrw4zea_n6pq9smeyp','platform:Win32 | lang:en-US | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36'),(222,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-26 15:53:07.718170','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(223,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 15:53:07.728691','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(224,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-26 16:22:52.767605','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(225,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 16:22:52.774611','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(226,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-26 16:49:00.642055','::ffff:127.0.0.1',NULL,NULL,NULL),(227,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 16:49:00.672107','::ffff:127.0.0.1',NULL,NULL,NULL),(228,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-26 16:55:43.980376','::ffff:127.0.0.1',NULL,NULL,NULL),(229,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 16:55:44.007939','::ffff:127.0.0.1',NULL,NULL,NULL),(230,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-26 17:31:11.224826','::ffff:127.0.0.1',NULL,NULL,NULL),(231,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 17:31:11.254265','::ffff:127.0.0.1',NULL,NULL,NULL),(232,5,'LOGIN','auth','5','{\"accessMode\": \"APP\"}','2026-04-26 17:49:02.878904','::ffff:127.0.0.1',NULL,NULL,NULL),(233,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 17:49:02.921228','::ffff:127.0.0.1',NULL,NULL,NULL),(234,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-26 17:54:26.238783','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(235,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-26 17:54:26.251722','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(236,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-04-28 21:26:28.630137','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(237,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-04-28 21:26:28.642048','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(238,1,'LOGIN','auth','1','{\"accessMode\": \"GLOBAL\"}','2026-05-04 09:26:10.647509','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'),(239,NULL,'POST','/api/v1/auth/login','/api/v1/auth/login','{\"query\": {}}','2026-05-04 09:26:10.662642','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` int NOT NULL,
  `app_id` int NOT NULL,
  `clinical_case_id` int DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `category_type_definition_id` int NOT NULL,
  `is_leaf_level` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_33ae50f3bb698c98dbc901d34e` (`course_id`,`app_id`),
  KEY `FK_2cca7e6c9f0fa11c74f4a34fbfc` (`app_id`),
  KEY `IDX_7f424499285935da26b6b947bb` (`clinical_case_id`,`parent_id`),
  KEY `FK_88cea2dc9c31951d06437879b40` (`parent_id`),
  KEY `FK_ff4f7f82bcae8a824a03e5a8589` (`category_type_definition_id`),
  CONSTRAINT `FK_0d321710f48526706247b8d4e3f` FOREIGN KEY (`clinical_case_id`) REFERENCES `clinical_cases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_2cca7e6c9f0fa11c74f4a34fbfc` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_4adb57bb2b0b74f37657b3052ba` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_88cea2dc9c31951d06437879b40` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ff4f7f82bcae8a824a03e5a8589` FOREIGN KEY (`category_type_definition_id`) REFERENCES `category_type_definitions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Ortopedia',1,1,1,NULL,0,1,0),(2,'Lombalgia',1,1,1,1,0,2,0),(3,'Ganho de amplitude',1,1,1,2,0,3,0),(4,'Iniciante',1,1,1,3,0,4,1),(5,'Intermediário',1,1,1,3,10,4,1),(6,'Avançado',1,1,1,3,20,4,1),(7,'ATM',1,1,2,NULL,0,5,0),(8,'Dor e limitação de abertura',1,1,2,7,0,6,0),(9,'Relaxamento e controle motor',1,1,2,8,0,7,0),(10,'Iniciante',1,1,2,9,0,8,1),(11,'Intermediário',1,1,2,9,10,8,1),(12,'Avançado',1,1,2,9,20,8,1);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category_type_definitions`
--

DROP TABLE IF EXISTS `category_type_definitions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_type_definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5e8d8d0b5a335eca6041c2431e` (`course_id`,`key`),
  CONSTRAINT `FK_57f816b4390071ff01ee6f8a11d` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category_type_definitions`
--

LOCK TABLES `category_type_definitions` WRITE;
/*!40000 ALTER TABLE `category_type_definitions` DISABLE KEYS */;
INSERT INTO `category_type_definitions` VALUES (1,1,'eixo','Eixo','Linha de cuidado / especialidade (ex.: Ortopedia).',0),(2,1,'problema','Problema / quadro clínico',NULL,10),(3,1,'objetivo','Objetivo terapêutico',NULL,20),(4,1,'nivel','Nível / progressão',NULL,30),(5,2,'eixo','Eixo','Linha de cuidado ATM.',0),(6,2,'problema','Problema / quadro clínico',NULL,10),(7,2,'objetivo','Objetivo terapêutico',NULL,20),(8,2,'nivel','Nível / progressão',NULL,30);
/*!40000 ALTER TABLE `category_type_definitions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clinical_cases`
--

DROP TABLE IF EXISTS `clinical_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clinical_cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `course_id` int NOT NULL,
  `app_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_16ffbe2564a1e43184a380c1b25` (`course_id`),
  KEY `FK_9600ccfe9976a105f89fadb0f70` (`app_id`),
  CONSTRAINT `FK_16ffbe2564a1e43184a380c1b25` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_9600ccfe9976a105f89fadb0f70` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clinical_cases`
--

LOCK TABLES `clinical_cases` WRITE;
/*!40000 ALTER TABLE `clinical_cases` DISABLE KEYS */;
INSERT INTO `clinical_cases` VALUES (1,'Caso clínico — Ortopedia','Hierarquia exemplo: Ortopedia → Lombalgia → Ganho de amplitude → Iniciante / Intermediário / Avançado (último nível: vínculo de exercícios ao paciente).',1,1),(2,'Caso clínico — Tratamento de ATM','Exemplo completo: ATM → quadro clínico → objetivo terapêutico → Iniciante / Intermediário / Avançado (nível final para vínculo de exercícios).',1,1);
/*!40000 ALTER TABLE `clinical_cases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consent_terms`
--

DROP TABLE IF EXISTS `consent_terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consent_terms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint NOT NULL DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `app_id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `course_id` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_f236bd46398698d6f47d96a014` (`app_id`,`active`),
  KEY `FK_eff59b468b949d248ee2132c6e5` (`created_by`),
  KEY `IDX_2b4d73b0e4d005b99330379ef6` (`course_id`,`active`),
  KEY `FK_f921210dadb9b8cbd74756f9c8c` (`updated_by`),
  CONSTRAINT `FK_c241e071de10ae09759e69e99c6` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_d3aa695907a1e38f57252aac025` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_eff59b468b949d248ee2132c6e5` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_f921210dadb9b8cbd74756f9c8c` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consent_terms`
--

LOCK TABLES `consent_terms` WRITE;
/*!40000 ALTER TABLE `consent_terms` DISABLE KEYS */;
INSERT INTO `consent_terms` VALUES (1,'<p>Termo de consentimento para tratamento fisioterapêutico (versão demonstração).</p>','0.8',0,1,'2026-04-09 17:27:03.968571',1,NULL,1,1,'2026-04-10 22:08:37.630'),(2,'<p>Versão anterior arquivada.</p>','0.9',1,1,'2026-04-09 17:27:03.972838',1,NULL,1,1,'2026-04-10 22:08:37.635');
/*!40000 ALTER TABLE `consent_terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_menu_nodes`
--

DROP TABLE IF EXISTS `course_menu_nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_menu_nodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `menu_node_id` int NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_3946e7aff14e0eff245a3e5b9d` (`course_id`,`menu_node_id`),
  KEY `FK_157b1a19fee51e1af361aef534c` (`menu_node_id`),
  CONSTRAINT `FK_0d505e34ade69e35cb873b42b82` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_157b1a19fee51e1af361aef534c` FOREIGN KEY (`menu_node_id`) REFERENCES `menu_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_menu_nodes`
--

LOCK TABLES `course_menu_nodes` WRITE;
/*!40000 ALTER TABLE `course_menu_nodes` DISABLE KEYS */;
INSERT INTO `course_menu_nodes` VALUES (12,3,1,1,0),(13,3,3,1,10),(14,4,1,1,0),(15,4,2,1,10),(16,4,3,1,20),(17,4,4,1,30),(18,4,5,1,40),(19,5,1,1,0),(20,5,2,1,10),(21,5,3,1,20),(22,5,4,1,30),(23,5,5,1,40),(24,6,1,1,0),(25,6,2,1,10),(26,6,3,1,20),(27,6,4,1,30),(28,6,5,1,40),(29,7,1,1,0),(30,7,2,1,10),(31,7,3,1,20),(32,7,4,1,30),(33,7,5,1,40),(34,8,1,1,0),(35,8,2,1,10),(36,8,3,1,20),(37,8,4,1,30),(38,8,5,1,40),(39,9,1,1,0),(40,9,2,1,10),(41,9,3,1,20),(42,9,4,1,30),(43,9,5,1,40),(44,10,1,1,0),(45,10,2,1,10),(46,10,3,1,20),(47,10,4,1,30),(48,10,5,1,40),(49,11,1,1,0),(50,11,2,1,10),(51,11,3,1,20),(52,11,4,1,30),(53,11,5,1,40),(54,12,1,1,0),(55,12,2,1,10),(56,12,3,1,20),(57,12,4,1,30),(58,12,5,1,40),(59,13,1,1,0),(60,13,2,1,10),(61,13,3,1,20),(62,13,4,1,30),(63,13,5,1,40),(64,14,1,1,0),(65,14,2,1,10),(66,14,3,1,20),(67,14,4,1,30),(68,14,5,1,40),(69,14,6,1,50),(79,1,1,1,10),(80,1,2,1,20),(81,1,3,1,30),(83,1,8,1,40),(84,1,4,1,50),(85,1,5,1,60),(86,1,6,0,60),(94,2,1,1,10),(95,2,2,0,20),(96,2,3,0,20),(97,2,4,0,30),(98,2,5,0,40),(99,2,6,0,60),(100,2,8,0,80);
/*!40000 ALTER TABLE `course_menu_nodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_id` int DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `navigation_json` json DEFAULT NULL,
  `case_context_label` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_b3ebae46faade326ee10cda153` (`app_id`),
  KEY `IDX_b6c197f9674788982b704a2eb5` (`app_id`,`active`),
  CONSTRAINT `FK_b3ebae46faade326ee10cda153d` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Fisioterapia',1,1,'2026-04-09 17:27:03.587136','2026-04-09 17:27:03.587136',NULL,'Caso clínico'),(2,'Medicina',2,0,'2026-04-09 17:27:03.593857','2026-04-11 18:00:52.000000',NULL,'Caso clínico'),(3,'Educação Física',3,0,'2026-04-09 17:27:03.598334','2026-04-09 20:45:31.000000',NULL,'Contexto de classificação'),(4,'Odontologia',4,0,'2026-04-09 17:27:03.603456','2026-04-09 20:45:31.000000',NULL,'Caso clínico'),(5,'Administração',5,0,'2026-04-09 17:27:03.607943','2026-04-09 20:45:35.000000',NULL,'Contexto de classificação'),(6,'Ciências Contábeis',6,0,'2026-04-09 17:27:03.612131','2026-04-09 20:45:33.000000',NULL,'Contexto de classificação'),(7,'Direito',7,0,'2026-04-09 17:27:03.616781','2026-04-09 20:45:42.000000',NULL,'Cenário jurídico'),(8,'Enfermagem',8,0,'2026-04-09 17:27:03.621956','2026-04-09 20:45:39.000000',NULL,'Caso clínico'),(9,'Engenharia de Software',9,0,'2026-04-09 17:27:03.626677','2026-04-09 20:45:41.000000',NULL,'Contexto de classificação'),(10,'Engenharia Mecânica',10,0,'2026-04-09 17:27:03.631419','2026-04-09 20:45:44.000000',NULL,'Contexto de classificação'),(11,'Farmácia',11,0,'2026-04-09 17:27:03.636880','2026-04-09 20:45:37.000000',NULL,'Caso clínico'),(12,'Pedagogia',12,0,'2026-04-09 17:27:03.642419','2026-04-09 20:45:49.000000',NULL,'Contexto de classificação'),(13,'Psicologia',13,0,'2026-04-09 17:27:03.649396','2026-04-09 20:45:47.000000',NULL,'Caso clínico'),(14,'Publicidade e Propaganda',14,0,'2026-04-09 17:27:03.654532','2026-04-09 20:45:46.000000',NULL,'Contexto de classificação');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_attendances`
--

DROP TABLE IF EXISTS `event_attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_attendances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('CONFIRMED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_token` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_29f047826e373a47d7d1cd3f1e` (`qr_token`),
  KEY `IDX_de6618bf206f5e0df5d17e5576` (`user_id`),
  KEY `IDX_641a7010ac57511808275cabbc` (`event_id`),
  CONSTRAINT `FK_641a7010ac57511808275cabbc0` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_de6618bf206f5e0df5d17e5576a` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_attendances`
--

LOCK TABLES `event_attendances` WRITE;
/*!40000 ALTER TABLE `event_attendances` DISABLE KEYS */;
INSERT INTO `event_attendances` VALUES (1,1,4,'CONFIRMED','6fb325ed9e3d9186aa8fc6e12e74c1f05d93ae608dfb91e0fe5fedb3c1ec8f6a709482a784a8e3194ec980a31d731eeb','2026-04-01 10:00:00'),(2,1,3,'CONFIRMED','bb461cd368cee1a5e8062f3f37c52dce00ce74a30f73cb8f8724dbf435408bd36600b9173f06f10bd91e259811ff5c36','2026-04-01 10:05:00');
/*!40000 ALTER TABLE `event_attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `course_id` int NOT NULL,
  `app_id` int NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `IDX_5af155636d8bc61547bf049273` (`app_id`,`course_id`,`starts_at`),
  KEY `FK_dc24ce0726f520b0d9cdc7448bd` (`course_id`),
  CONSTRAINT `FK_1815c01d805f781bf3ec448f411` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_dc24ce0726f520b0d9cdc7448bd` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (1,'Workshop: reabilitação lombar','Encontro presencial — laboratório de movimento.','2026-06-10 14:00:00','2026-06-10 17:00:00',1,1,'Campus UNIFAE — Sala 12',1);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercise_attachments`
--

DROP TABLE IF EXISTS `exercise_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercise_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exercise_id` int NOT NULL,
  `kind` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size_bytes` int unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_0fcfbf793bca89fb98bfb0c5d5` (`exercise_id`),
  CONSTRAINT `FK_0fcfbf793bca89fb98bfb0c5d50` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercise_attachments`
--

LOCK TABLES `exercise_attachments` WRITE;
/*!40000 ALTER TABLE `exercise_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `exercise_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercise_categories`
--

DROP TABLE IF EXISTS `exercise_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercise_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exercise_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_54296a5b8dbfac8fcd218eb3d2` (`category_id`),
  KEY `IDX_e35f9d02087fdd250b13d29a0a` (`exercise_id`),
  CONSTRAINT `FK_54296a5b8dbfac8fcd218eb3d21` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e35f9d02087fdd250b13d29a0a6` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercise_categories`
--

LOCK TABLES `exercise_categories` WRITE;
/*!40000 ALTER TABLE `exercise_categories` DISABLE KEYS */;
INSERT INTO `exercise_categories` VALUES (4,3,5),(5,4,10),(10,1,4),(14,2,4),(15,2,6),(16,2,5),(17,2,10),(18,2,11),(19,2,12);
/*!40000 ALTER TABLE `exercise_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercises`
--

DROP TABLE IF EXISTS `exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercises` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `instructions` text COLLATE utf8mb4_unicode_ci,
  `created_by` int NOT NULL,
  `course_id` int NOT NULL,
  `app_id` int NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `video_url` varchar(2048) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_eef3845c1cf7258ddac9844134` (`active`),
  KEY `IDX_04f0913a3334b245234bd6d347` (`created_by`),
  KEY `IDX_820c2d4748dc82db1ce85271a6` (`course_id`,`app_id`),
  KEY `FK_7255707a0600608df2cc016e41e` (`app_id`),
  CONSTRAINT `FK_04f0913a3334b245234bd6d3479` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_1505e8011238ec3d905919268ba` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_7255707a0600608df2cc016e41e` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercises`
--

LOCK TABLES `exercises` WRITE;
/*!40000 ALTER TABLE `exercises` DISABLE KEYS */;
INSERT INTO `exercises` VALUES (1,'Agachamento assistido','Fortalecimento MMII com supervisão.','Manter joelhos alinhados ao médio pé.',3,1,1,1,'2026-04-09 17:27:03.886741','2026-04-09 18:40:22.000000','https://www.youtube.com/watch?v=nIzG6XZX8lw&list=RDnIzG6XZX8lw&start_radio=1'),(2,'Prancha isométrica','Estabilização do core.','Corpo alinhado, evitar hiperslordose.',3,1,1,1,'2026-04-09 17:27:03.890737','2026-04-09 17:27:03.890737',NULL),(3,'Alongamento posterior de coxa','Flexibilidade isquiotibiais.','Manter por 30s cada lado.',3,1,1,1,'2026-04-09 17:27:03.893083','2026-04-09 17:27:03.893083',NULL),(4,'Relaxamento supra-hióideo','Consciência e soltura da musculatura mastigadora.','Toque leve nos músculos, boca levemente entreaberta, respiração calma.',3,1,1,1,'2026-04-09 17:27:03.922266','2026-04-09 17:27:03.922266',NULL);
/*!40000 ALTER TABLE `exercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `menu_nodes`
--

DROP TABLE IF EXISTS `menu_nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `menu_nodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int DEFAULT NULL,
  `key` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `route_name` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `include_in_new_courses` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9b75f5c4503fb437fe5b3c2a37` (`key`),
  KEY `FK_d437003242e140f4605ddf91f08` (`parent_id`),
  CONSTRAINT `FK_d437003242e140f4605ddf91f08` FOREIGN KEY (`parent_id`) REFERENCES `menu_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `menu_nodes`
--

LOCK TABLES `menu_nodes` WRITE;
/*!40000 ALTER TABLE `menu_nodes` DISABLE KEYS */;
INSERT INTO `menu_nodes` VALUES (1,NULL,'overview','Visão geral','school','course-hub',1),(2,NULL,'patients','Pacientes','personal_injury',NULL,0),(3,NULL,'exercises','Exercícios','fitness_center',NULL,0),(4,NULL,'prescriptions','Prescrições','medical_services',NULL,0),(5,NULL,'approvals','Aprovações','verified',NULL,0),(6,NULL,'library','Biblioteca de arquivos','folder',NULL,0),(8,NULL,'patient-history','História do paciente','auto_stories',NULL,0);
/*!40000 ALTER TABLE `menu_nodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `motivational_messages`
--

DROP TABLE IF EXISTS `motivational_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `motivational_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_b0399d31d9783d7dc8b8d93ef8` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `motivational_messages`
--

LOCK TABLES `motivational_messages` WRITE;
/*!40000 ALTER TABLE `motivational_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `motivational_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_310667f935698fcd8cb319113a` (`user_id`,`created_at`),
  KEY `IDX_5323ccd23482802bd9759e88ee` (`user_id`,`read_at`),
  CONSTRAINT `FK_9a8a82462cab47c73d25f49261f` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,2,'PRESCRIPTION_PENDING','Nova prescrição para análise','Aluno André Lucas enviou uma prescrição pendente para o paciente Fernando Ueno.',NULL,'{\"route\": {\"name\": \"approvals\"}, \"patientName\": \"Fernando Ueno\", \"prescriptionId\": 41}','2026-04-11 18:04:58.718155'),(2,3,'PRESCRIPTION_PENDING','Nova prescrição para análise','Aluno André Lucas enviou uma prescrição pendente para o paciente Fernando Ueno.',NULL,'{\"route\": {\"name\": \"approvals\"}, \"patientName\": \"Fernando Ueno\", \"prescriptionId\": 41}','2026-04-11 18:04:58.721613');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_91185d86d5d7557b19abbb2868` (`token_hash`),
  KEY `IDX_52ac39dd8a28730c63aeb428c9` (`user_id`),
  CONSTRAINT `FK_52ac39dd8a28730c63aeb428c9c` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (5,6,'ca70a0b6d7026bd4ea45c1671a661bfa2927a145ce217edab4e0d864ce816080','2026-04-11 18:59:20','2026-04-11 17:59:19.826613');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_assessments`
--

DROP TABLE IF EXISTS `patient_assessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `assessor_id` int NOT NULL,
  `functionDetails` text COLLATE utf8mb4_unicode_ci,
  `symptomsDetails` text COLLATE utf8mb4_unicode_ci,
  `safetyDetails` text COLLATE utf8mb4_unicode_ci,
  `digitalLiteracyScore` int NOT NULL DEFAULT '0',
  `socialSupportDetails` text COLLATE utf8mb4_unicode_ci,
  `riskLevel` enum('PENDING','RED','YELLOW','GREEN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `justification` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_f5f49098a656d8b22efd69b739` (`patient_id`),
  KEY `FK_d207c40ba49d59640eade607625` (`assessor_id`),
  CONSTRAINT `FK_d207c40ba49d59640eade607625` FOREIGN KEY (`assessor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_f5f49098a656d8b22efd69b7397` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_assessments`
--

LOCK TABLES `patient_assessments` WRITE;
/*!40000 ALTER TABLE `patient_assessments` DISABLE KEYS */;
INSERT INTO `patient_assessments` VALUES (1,2,1,'Teste','Teste2','Teste3',2,'Teste4','GREEN','Teste5','2026-04-11 12:26:55.600496'),(2,3,4,'teste','teste2','teste3',3,'teste4','GREEN','ok','2026-04-11 18:03:56.531729');
/*!40000 ALTER TABLE `patient_assessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_care_episodes`
--

DROP TABLE IF EXISTS `patient_care_episodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_care_episodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `clinical_case_id` int DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','RESOLVED','ARCHIVED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `started_at` date NOT NULL,
  `ended_at` date DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2865647636f2769d0dc2c4e676` (`patient_id`),
  KEY `FK_ad4651ef0812fe995616fd36ea1` (`clinical_case_id`),
  CONSTRAINT `FK_2865647636f2769d0dc2c4e6760` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ad4651ef0812fe995616fd36ea1` FOREIGN KEY (`clinical_case_id`) REFERENCES `clinical_cases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_care_episodes`
--

LOCK TABLES `patient_care_episodes` WRITE;
/*!40000 ALTER TABLE `patient_care_episodes` DISABLE KEYS */;
INSERT INTO `patient_care_episodes` VALUES (1,3,NULL,'Acompanhamento geral',NULL,'ACTIVE','2026-04-10',NULL,'2026-04-11 18:03:32.544500','2026-04-11 18:03:32.544500');
/*!40000 ALTER TABLE `patient_care_episodes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_consent_acceptances`
--

DROP TABLE IF EXISTS `patient_consent_acceptances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_consent_acceptances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `consent_term_id` int NOT NULL,
  `accepted_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `document_hash` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_24f4c8ad15497ee8565dd4e294` (`consent_term_id`),
  KEY `IDX_91732f06b8a8512e961da0e98b` (`patient_id`),
  KEY `FK_c9cb0f411c04cd856d6145ac2a8` (`app_id`),
  CONSTRAINT `FK_24f4c8ad15497ee8565dd4e2949` FOREIGN KEY (`consent_term_id`) REFERENCES `consent_terms` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_91732f06b8a8512e961da0e98bb` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_c9cb0f411c04cd856d6145ac2a8` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_consent_acceptances`
--

LOCK TABLES `patient_consent_acceptances` WRITE;
/*!40000 ALTER TABLE `patient_consent_acceptances` DISABLE KEYS */;
INSERT INTO `patient_consent_acceptances` VALUES (1,1,1,'2026-03-01 14:00:00.000000','127.0.0.1','UNIFAE-Care/1.0','9222a91f9752c76e44fa9cd18e42193d',1),(2,2,1,'2026-03-10 11:20:00.000000','127.0.0.1','UNIFAE-Care/1.0','9222a91f9752c76e44fa9cd18e42193d',1);
/*!40000 ALTER TABLE `patient_consent_acceptances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_executions`
--

DROP TABLE IF EXISTS `patient_executions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_executions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `prescription_item_id` int NOT NULL,
  `performed_at` datetime NOT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `status` enum('COMPLETED','PARTIAL','SKIPPED') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_5df1d53cadf0216601c1f3a779` (`prescription_item_id`),
  KEY `IDX_f473dd9afd2038f79c12024842` (`patient_id`,`performed_at`),
  KEY `IDX_a3e200bee6705b70f101d4a28b` (`performed_at`),
  CONSTRAINT `FK_5df1d53cadf0216601c1f3a7795` FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ce3ac30d9bd36947afa439be473` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_executions`
--

LOCK TABLES `patient_executions` WRITE;
/*!40000 ALTER TABLE `patient_executions` DISABLE KEYS */;
INSERT INTO `patient_executions` VALUES (1,1,3,'2026-03-26 09:00:00','Sem queixas.','COMPLETED'),(2,1,3,'2026-03-27 09:00:00','Sem queixas.','COMPLETED'),(3,1,3,'2026-03-28 09:00:00','Leve desconforto.','PARTIAL'),(4,1,3,'2026-03-29 09:00:00','Sem queixas.','COMPLETED'),(5,1,3,'2026-03-30 09:00:00','Sem queixas.','COMPLETED'),(6,1,3,'2026-03-31 09:00:00','Leve desconforto.','COMPLETED'),(7,1,3,'2026-04-01 09:00:00','Sem queixas.','PARTIAL'),(8,1,3,'2026-04-02 09:00:00','Sem queixas.','COMPLETED'),(9,1,3,'2026-04-03 09:00:00','Leve desconforto.','COMPLETED'),(10,1,3,'2026-04-04 09:00:00','Sem queixas.','COMPLETED'),(11,1,3,'2026-04-05 09:00:00','Sem queixas.','PARTIAL'),(12,1,3,'2026-04-06 09:00:00','Leve desconforto.','COMPLETED'),(13,1,3,'2026-04-07 09:00:00','Sem queixas.','COMPLETED'),(14,1,3,'2026-04-08 09:00:00','Sem queixas.','COMPLETED'),(15,1,12,'2026-04-07 13:10:21',NULL,'COMPLETED'),(16,2,13,'2026-04-07 13:10:21',NULL,'COMPLETED'),(17,1,16,'2026-04-03 13:10:21',NULL,'COMPLETED'),(18,2,17,'2026-04-03 13:10:21',NULL,'COMPLETED'),(19,1,18,'2026-04-02 13:10:21',NULL,'COMPLETED'),(20,2,20,'2026-04-01 13:10:21',NULL,'COMPLETED'),(21,1,21,'2026-03-30 13:10:21',NULL,'COMPLETED'),(22,2,22,'2026-03-28 13:10:21',NULL,'COMPLETED'),(23,2,23,'2026-03-27 13:10:21',NULL,'COMPLETED'),(24,1,26,'2026-03-25 13:10:21',NULL,'COMPLETED'),(25,2,28,'2026-03-24 13:10:21',NULL,'COMPLETED'),(26,1,29,'2026-03-23 13:10:21',NULL,'COMPLETED'),(27,2,30,'2026-03-22 13:10:21',NULL,'COMPLETED'),(28,1,32,'2026-03-19 13:10:21',NULL,'COMPLETED'),(29,1,34,'2026-03-17 13:10:21',NULL,'COMPLETED'),(30,1,35,'2026-03-16 13:10:21',NULL,'COMPLETED'),(31,2,36,'2026-03-16 13:10:21',NULL,'COMPLETED'),(32,2,37,'2026-03-14 13:10:21',NULL,'COMPLETED'),(33,1,38,'2026-03-13 13:10:21',NULL,'COMPLETED'),(34,1,39,'2026-03-12 13:10:21',NULL,'COMPLETED'),(35,1,40,'2026-03-08 13:10:21',NULL,'COMPLETED'),(36,1,42,'2026-03-05 13:10:21',NULL,'COMPLETED'),(37,2,43,'2026-03-05 13:10:21',NULL,'COMPLETED');
/*!40000 ALTER TABLE `patient_executions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_pain_logs`
--

DROP TABLE IF EXISTS `patient_pain_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_pain_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `day` date NOT NULL,
  `reported_at` datetime NOT NULL,
  `level` enum('NONE','MILD','SEVERE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_32936229c6420a906d54723cb1` (`patient_id`,`day`),
  KEY `IDX_6236fc96ffce1a4fb612a919e3` (`day`),
  CONSTRAINT `FK_581510ff05695b408f8e437ca11` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_pain_logs`
--

LOCK TABLES `patient_pain_logs` WRITE;
/*!40000 ALTER TABLE `patient_pain_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `patient_pain_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `student_id` int NOT NULL,
  `professor_id` int DEFAULT NULL,
  `course_id` int NOT NULL,
  `app_id` int NOT NULL,
  `latest_risk_level` enum('PENDING','RED','YELLOW','GREEN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_7fe1518dc780fd777669b5cb7a` (`user_id`),
  KEY `IDX_0943d7e0c83ceef05a7b39ec8f` (`course_id`,`app_id`),
  KEY `IDX_f7c61e3b1e641381857d03ed09` (`professor_id`),
  KEY `IDX_b76db8d21e50a00705d33694d5` (`student_id`),
  KEY `FK_cf50e0d4bf7c0008cfc1235ff6d` (`app_id`),
  CONSTRAINT `FK_49f8844df5a00bb0cb56d7c511b` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_7fe1518dc780fd777669b5cb7a0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_b76db8d21e50a00705d33694d5d` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_cf50e0d4bf7c0008cfc1235ff6d` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_f7c61e3b1e641381857d03ed09d` FOREIGN KEY (`professor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (1,5,4,3,1,1,'PENDING'),(2,6,4,3,1,1,'GREEN'),(3,7,4,NULL,1,1,'GREEN');
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prescription_items`
--

DROP TABLE IF EXISTS `prescription_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescription_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prescription_id` int NOT NULL,
  `exercise_id` int NOT NULL,
  `instructions` text COLLATE utf8mb4_unicode_ci,
  `repetitions` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `IDX_a603d92d4a8459db5fbe45a4ae` (`prescription_id`),
  KEY `FK_ef75bec329c8a1b254fc7d9fc4c` (`exercise_id`),
  CONSTRAINT `FK_a603d92d4a8459db5fbe45a4aea` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ef75bec329c8a1b254fc7d9fc4c` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prescription_items`
--

LOCK TABLES `prescription_items` WRITE;
/*!40000 ALTER TABLE `prescription_items` DISABLE KEYS */;
INSERT INTO `prescription_items` VALUES (1,1,1,'3 séries de 10 repetições','10','Sem dor à flexão'),(2,1,2,'3x 30s','30s',NULL),(3,2,3,'Diário','30s/lado',NULL),(4,2,2,'Isometria','3x20s',NULL),(5,3,1,'Carga reduzida (rejeitado para revisão)','6','Professor solicitou replanejamento'),(6,4,2,'faz ae','31',NULL),(7,4,1,'faz','11',NULL),(8,5,2,NULL,'3x10',NULL),(9,6,4,NULL,'3x10',NULL),(10,7,4,NULL,'3x10',NULL),(11,8,2,NULL,'3x10',NULL),(12,9,3,NULL,'3x10',NULL),(13,10,4,NULL,'3x10',NULL),(14,11,1,NULL,'3x10',NULL),(15,12,3,NULL,'3x10',NULL),(16,13,2,NULL,'3x10',NULL),(17,14,4,NULL,'3x10',NULL),(18,15,1,NULL,'3x10',NULL),(19,16,3,NULL,'3x10',NULL),(20,17,2,NULL,'3x10',NULL),(21,18,1,NULL,'3x10',NULL),(22,19,1,NULL,'3x10',NULL),(23,20,2,NULL,'3x10',NULL),(24,21,2,NULL,'3x10',NULL),(25,22,3,NULL,'3x10',NULL),(26,23,4,NULL,'3x10',NULL),(27,24,1,NULL,'3x10',NULL),(28,25,1,NULL,'3x10',NULL),(29,26,3,NULL,'3x10',NULL),(30,27,3,NULL,'3x10',NULL),(31,28,4,NULL,'3x10',NULL),(32,29,4,NULL,'3x10',NULL),(33,30,2,NULL,'3x10',NULL),(34,31,1,NULL,'3x10',NULL),(35,32,4,NULL,'3x10',NULL),(36,33,3,NULL,'3x10',NULL),(37,34,4,NULL,'3x10',NULL),(38,35,3,NULL,'3x10',NULL),(39,36,4,NULL,'3x10',NULL),(40,37,4,NULL,'3x10',NULL),(41,38,1,NULL,'3x10',NULL),(42,39,3,NULL,'3x10',NULL),(43,40,4,NULL,'3x10',NULL),(44,41,1,'ok','3x10','1 min descanso');
/*!40000 ALTER TABLE `prescription_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prescriptions`
--

DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `student_id` int NOT NULL,
  `professor_id` int DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `justification` text COLLATE utf8mb4_unicode_ci,
  `next_visit_date` datetime DEFAULT NULL,
  `app_id` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `care_episode_id` int DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `decided_by_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_8afd38b4e0074205b2d4a85130` (`created_at`),
  KEY `IDX_cfef3ec8080c5c7922840050b8` (`app_id`),
  KEY `IDX_9389db557647131856661f7d7b` (`patient_id`),
  KEY `FK_5c783f01b2cb5395c015d9fbadd` (`student_id`),
  KEY `FK_af2a6fd1c4c5a42554882206992` (`professor_id`),
  KEY `IDX_e365474c105463dbd470f2f785` (`care_episode_id`),
  KEY `FK_31439242727f872aed525c3ca35` (`decided_by_id`),
  KEY `IDX_414e0cee0efdee5a65a2bad9cd` (`status`),
  CONSTRAINT `FK_31439242727f872aed525c3ca35` FOREIGN KEY (`decided_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_5c783f01b2cb5395c015d9fbadd` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_9389db557647131856661f7d7b5` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_af2a6fd1c4c5a42554882206992` FOREIGN KEY (`professor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_cfef3ec8080c5c7922840050b87` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e365474c105463dbd470f2f7855` FOREIGN KEY (`care_episode_id`) REFERENCES `patient_care_episodes` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prescriptions`
--

LOCK TABLES `prescriptions` WRITE;
/*!40000 ALTER TABLE `prescriptions` DISABLE KEYS */;
INSERT INTO `prescriptions` VALUES (1,1,4,3,'PENDING',NULL,NULL,1,'2026-04-09 17:27:03.931479',NULL,NULL,NULL),(2,1,4,3,'APPROVED','Protocolo adequado ao caso clínico.','2026-05-15 10:00:00',1,'2026-04-09 17:27:03.935825',NULL,NULL,NULL),(3,2,4,3,'REJECTED','Volume excessivo para fase aguda — revisar cargas.',NULL,1,'2026-04-09 17:27:03.937942',NULL,NULL,NULL),(4,2,4,3,'PENDING','lasdasd','2026-04-09 23:54:00',1,'2026-04-09 23:55:02.295709',NULL,NULL,NULL),(5,1,4,NULL,'PENDING',NULL,NULL,1,'2026-04-10 13:10:20.678000',NULL,NULL,NULL),(6,2,4,NULL,'PENDING',NULL,NULL,1,'2026-04-09 13:10:20.678000',NULL,NULL,NULL),(7,1,4,NULL,'PENDING',NULL,NULL,1,'2026-04-08 13:10:20.678000',NULL,NULL,NULL),(8,2,4,NULL,'PENDING',NULL,NULL,1,'2026-04-08 13:10:20.678000',NULL,NULL,NULL),(9,1,4,NULL,'PENDING',NULL,NULL,1,'2026-04-07 13:10:20.678000',NULL,NULL,NULL),(10,2,4,NULL,'APPROVED',NULL,NULL,1,'2026-04-07 13:10:20.678000',NULL,NULL,NULL),(11,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-04-05 13:10:20.678000',NULL,NULL,NULL),(12,2,4,NULL,'PENDING',NULL,NULL,1,'2026-04-05 13:10:20.678000',NULL,NULL,NULL),(13,1,4,NULL,'PENDING',NULL,NULL,1,'2026-04-03 13:10:20.678000',NULL,NULL,NULL),(14,2,4,NULL,'PENDING',NULL,NULL,1,'2026-04-03 13:10:20.678000',NULL,NULL,NULL),(15,1,4,NULL,'PENDING',NULL,NULL,1,'2026-04-02 13:10:20.678000',NULL,NULL,NULL),(16,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-04-01 13:10:20.678000',NULL,NULL,NULL),(17,2,4,NULL,'PENDING',NULL,NULL,1,'2026-04-01 13:10:20.678000',NULL,NULL,NULL),(18,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-30 13:10:20.678000',NULL,NULL,NULL),(19,2,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-28 13:10:20.678000',NULL,NULL,NULL),(20,2,4,NULL,'PENDING',NULL,NULL,1,'2026-03-27 13:10:20.678000',NULL,NULL,NULL),(21,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-26 13:10:20.678000',NULL,NULL,NULL),(22,2,4,NULL,'PENDING',NULL,NULL,1,'2026-03-26 13:10:20.678000',NULL,NULL,NULL),(23,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-25 13:10:20.678000',NULL,NULL,NULL),(24,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-24 13:10:20.678000',NULL,NULL,NULL),(25,2,4,NULL,'PENDING',NULL,NULL,1,'2026-03-24 13:10:20.678000',NULL,NULL,NULL),(26,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-23 13:10:20.678000',NULL,NULL,NULL),(27,2,4,NULL,'PENDING',NULL,NULL,1,'2026-03-22 13:10:20.678000',NULL,NULL,NULL),(28,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-21 13:10:20.678000',NULL,NULL,NULL),(29,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-19 13:10:20.678000',NULL,NULL,NULL),(30,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-18 13:10:20.678000',NULL,NULL,NULL),(31,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-17 13:10:20.678000',NULL,NULL,NULL),(32,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-16 13:10:20.678000',NULL,NULL,NULL),(33,2,4,NULL,'PENDING',NULL,NULL,1,'2026-03-16 13:10:20.678000',NULL,NULL,NULL),(34,2,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-14 13:10:20.678000',NULL,NULL,NULL),(35,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-13 13:10:20.678000',NULL,NULL,NULL),(36,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-12 13:10:20.678000',NULL,NULL,NULL),(37,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-08 13:10:20.678000',NULL,NULL,NULL),(38,1,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-06 13:10:20.678000',NULL,NULL,NULL),(39,1,4,NULL,'PENDING',NULL,NULL,1,'2026-03-05 13:10:20.678000',NULL,NULL,NULL),(40,2,4,NULL,'APPROVED',NULL,NULL,1,'2026-03-05 13:10:20.678000',NULL,NULL,NULL),(41,3,4,NULL,'PENDING','teste','2026-04-17 18:04:00',1,'2026-04-11 18:04:58.707542',1,NULL,NULL);
/*!40000 ALTER TABLE `prescriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_consent_acceptances`
--

DROP TABLE IF EXISTS `user_consent_acceptances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_consent_acceptances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `consent_term_id` int NOT NULL,
  `course_id` int NOT NULL,
  `accepted_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `device_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_c5050e5a2fb043e12176a37333` (`user_id`,`consent_term_id`),
  KEY `IDX_2049f5fb6ccc33d2a57beeb0c3` (`course_id`),
  KEY `IDX_3a99d6829d3885bbf231718c1a` (`user_id`),
  KEY `FK_a5143d6c3be86dba52b99fbeab2` (`consent_term_id`),
  CONSTRAINT `FK_2049f5fb6ccc33d2a57beeb0c3d` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_3a99d6829d3885bbf231718c1a3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_a5143d6c3be86dba52b99fbeab2` FOREIGN KEY (`consent_term_id`) REFERENCES `consent_terms` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_consent_acceptances`
--

LOCK TABLES `user_consent_acceptances` WRITE;
/*!40000 ALTER TABLE `user_consent_acceptances` DISABLE KEYS */;
INSERT INTO `user_consent_acceptances` VALUES (1,5,1,1,'2026-04-10 21:02:02.299550','::ffff:127.0.0.1',NULL,NULL,NULL,'8f5d45231e0288311dae3334757bfcb5265d2535291ecef593960fb148e3312a'),(2,5,2,1,'2026-04-10 21:04:53.272995','::ffff:127.0.0.1',NULL,NULL,NULL,'8710e00fd033363d73e05f16a4b8ee20416e375d9bf2f9896cfb8ff387493784');
/*!40000 ALTER TABLE `user_consent_acceptances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_devices`
--

DROP TABLE IF EXISTS `user_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_seen_at` datetime NOT NULL,
  `last_seen_at` datetime NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_69b11f34c0f681c815fb697101` (`user_id`,`device_id`),
  KEY `IDX_3223d5ebcc63cc83485d0b1c90` (`user_id`,`last_seen_at`),
  CONSTRAINT `FK_28bd79e1b3f7c1168f0904ce241` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_devices`
--

LOCK TABLES `user_devices` WRITE;
/*!40000 ALTER TABLE `user_devices` DISABLE KEYS */;
INSERT INTO `user_devices` VALUES (1,1,'mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-09 09:01:43','2026-05-04 09:26:11','2026-04-09 09:01:42.645651','2026-05-04 09:26:10.000000'),(2,5,'simulador-curl-001','Curl CLI','::ffff:127.0.0.1',NULL,'2026-04-10 18:01:35','2026-04-10 18:34:12','2026-04-10 18:01:34.828863','2026-04-10 18:34:11.000000'),(3,2,'mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-10 22:18:52','2026-04-15 10:00:20','2026-04-10 22:18:52.390414','2026-04-15 10:00:20.000000'),(4,4,'mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36','2026-04-10 22:19:33','2026-04-11 18:03:06','2026-04-10 22:19:32.963016','2026-04-11 18:03:05.000000'),(5,1,'mnrw4zea_n6pq9smeyp','platform:Win32 | lang:en-US | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/3.2.10 Chrome/142.0.7444.265 Electron/39.8.1 Safari/537.36','2026-04-26 15:43:35','2026-04-26 15:43:35','2026-04-26 15:43:34.690118','2026-04-26 15:43:34.690118');
/*!40000 ALTER TABLE `user_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','COORDINATOR','PROFESSOR','STUDENT','PATIENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` int DEFAULT NULL,
  `app_id` int DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `first_login_at` datetime DEFAULT NULL,
  `first_login_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_login_device_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_login_device_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `active_from` date DEFAULT NULL,
  `active_until` date DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `profile_photo_path` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  KEY `IDX_ace513fa30d485cfd25c11a9e4` (`role`),
  KEY `IDX_af2518518efa1699a1a24903de` (`course_id`),
  KEY `IDX_d09943c291663c7fc13686e548` (`app_id`),
  CONSTRAINT `FK_af2518518efa1699a1a24903de9` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_d09943c291663c7fc13686e5486` FOREIGN KEY (`app_id`) REFERENCES `apps` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador Sistema','admin@unifae.local','$2b$10$9IvNoFk4z6vgvmDRZjVqy.FLtw.3.VktjgCEr9f9SQxbWgJC4x2AK','ADMIN',NULL,1,'2026-04-09 17:27:03.834282','2026-05-04 09:26:10.000000','2026-04-09 17:27:39','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',1,NULL,NULL,'2026-05-04 09:26:11',NULL,NULL),(2,'Coord. Vanessa','coordenador@unifae.local','$2b$10$9IvNoFk4z6vgvmDRZjVqy.FLtw.3.VktjgCEr9f9SQxbWgJC4x2AK','COORDINATOR',1,1,'2026-04-09 17:27:03.838977','2026-04-15 10:00:59.250466','2026-04-10 22:18:52','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',1,NULL,NULL,'2026-04-15 10:00:20',NULL,NULL),(3,'Prof. Dr. Ricardo Mendes','professor@unifae.local','$2b$10$9IvNoFk4z6vgvmDRZjVqy.FLtw.3.VktjgCEr9f9SQxbWgJC4x2AK','PROFESSOR',1,1,'2026-04-09 17:27:03.841381','2026-04-09 17:27:03.841381',NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),(4,'Aluno André Lucas','aluno@unifae.local','$2b$10$9IvNoFk4z6vgvmDRZjVqy.FLtw.3.VktjgCEr9f9SQxbWgJC4x2AK','STUDENT',1,1,'2026-04-09 17:27:03.843555','2026-04-11 18:03:05.000000','2026-04-10 22:19:33','::1','mnrebop4_nkviwu1lrl','platform:Win32 | lang:pt-BR | ua:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',1,NULL,NULL,'2026-04-11 18:03:06',NULL,NULL),(5,'Maria Aparecida Souza','paciente1@unifae.local','$2b$10$9IvNoFk4z6vgvmDRZjVqy.FLtw.3.VktjgCEr9f9SQxbWgJC4x2AK','PATIENT',1,1,'2026-04-09 17:27:03.847991','2026-04-26 17:49:02.000000','2026-04-10 18:00:11','::1',NULL,NULL,1,NULL,NULL,'2026-04-26 17:49:03',NULL,NULL),(6,'João Pedro Alcântara','fernandoueno@outlook.com','$2b$10$3yXIkbNbaIdfkwoqfw.KEeMYxoPf0MhwQoZbmLhRcOc9.qu9qW4jm','PATIENT',1,1,'2026-04-09 17:27:03.850679','2026-04-11 17:59:08.581348',NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),(7,'Fernando Ueno','fernandoueno2@outlook.com','$2b$10$bmdSSeo/sQ6CfU66DZvoIe09GNMb72H.DPRIzNIizHI888ViMVb4G','PATIENT',1,1,'2026-04-11 18:03:32.539529','2026-04-11 18:03:32.539529',NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'unifae_management'
--

--
-- Dumping routines for database 'unifae_management'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-04 10:26:18
