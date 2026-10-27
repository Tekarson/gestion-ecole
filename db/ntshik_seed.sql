-- NTSHIK seed — generated on MariaDB 15.1 Distrib 10.4.28-MariaDB,
-- Host: 127.0.0.1    Database: ntshik
-- Usage: mysql -u <user> <dbname> < db/ntshik_seed.sql
--
-- Server version	10.4.28-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `family_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_foreign` (`user_id`),
  KEY `audit_logs_family_id_foreign` (`family_id`),
  CONSTRAINT `audit_logs_family_id_foreign` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL,
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,1,'payment.received','{\"reference\":\"REC-2026-000101\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(2,1,1,'payment.received','{\"reference\":\"REC-2026-000102\",\"amount\":1000}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,1,1,'payment.received','{\"reference\":\"REC-2026-000103\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(4,1,1,'payment.received','{\"reference\":\"REC-2026-000104\",\"amount\":1700}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(5,1,2,'payment.received','{\"reference\":\"REC-2026-000105\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(6,1,2,'payment.received','{\"reference\":\"REC-2026-000106\",\"amount\":1000}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(7,1,2,'payment.received','{\"reference\":\"REC-2026-000107\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(8,1,2,'payment.received','{\"reference\":\"REC-2026-000108\",\"amount\":1300}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(9,1,2,'payment.received','{\"reference\":\"REC-2026-000109\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(10,1,3,'payment.received','{\"reference\":\"REC-2026-000110\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(11,1,3,'payment.received','{\"reference\":\"REC-2026-000111\",\"amount\":1000}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(12,1,3,'payment.received','{\"reference\":\"REC-2026-000112\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(13,1,3,'payment.received','{\"reference\":\"REC-2026-000113\",\"amount\":1000}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(14,1,3,'payment.received','{\"reference\":\"REC-2026-000114\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(15,1,3,'payment.received','{\"reference\":\"REC-2026-000115\",\"amount\":1300}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(16,1,3,'payment.received','{\"reference\":\"REC-2026-000116\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(17,1,3,'payment.received','{\"reference\":\"REC-2026-000117\",\"amount\":1700}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(18,1,4,'payment.received','{\"reference\":\"REC-2026-000118\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(19,1,4,'payment.received','{\"reference\":\"REC-2026-000119\",\"amount\":1000}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(20,1,4,'payment.received','{\"reference\":\"REC-2026-000120\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(21,1,4,'payment.received','{\"reference\":\"REC-2026-000121\",\"amount\":1300}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(22,1,4,'payment.received','{\"reference\":\"REC-2026-000122\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(23,1,4,'payment.received','{\"reference\":\"REC-2026-000123\",\"amount\":200}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(24,1,NULL,'seed.created','{\"year\":\"2026-2027\"}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(25,1,NULL,'settings.updated','{\"fee_settings\":4,\"classes\":15}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(26,1,NULL,'student.created','{\"matricule\":\"2026-0001\"}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(27,1,NULL,'student.created','{\"matricule\":\"2026-0006\"}','2026-09-19 08:58:35','2026-09-19 08:58:35'),(28,1,NULL,'student.created','{\"matricule\":\"2026-0017\"}','2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `families`
--

DROP TABLE IF EXISTS `families`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `families` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_name` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `families`
--

LOCK TABLES `families` WRITE;
/*!40000 ALTER TABLE `families` DISABLE KEYS */;
INSERT INTO `families` VALUES (1,'Renedy Karume','+243812345678','Goma','2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'Clarisse Kabasele','+243823456789','Goma','2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,'Joseph Katembo','+243834567890','Goma','2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,'Louange Mbuyi','+243845678901','Goma','2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `families` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fee_settings`
--

DROP TABLE IF EXISTS `fee_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fee_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `amount` decimal(8,2) NOT NULL,
  `category` varchar(255) NOT NULL,
  `term` tinyint(3) unsigned DEFAULT NULL,
  `school_year` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fee_settings_label_unique` (`label`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fee_settings`
--

LOCK TABLES `fee_settings` WRITE;
/*!40000 ALTER TABLE `fee_settings` DISABLE KEYS */;
INSERT INTO `fee_settings` VALUES (1,'inscription',200.00,'inscription',NULL,'2026-2027','2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'uniforme',40.00,'fixed',NULL,'2026-2027','2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,'assurance',20.00,'fixed',NULL,'2026-2027','2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,'divers',150.00,'fixed',NULL,'2026-2027','2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `fee_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations`
--

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'2019_12_14_000001_create_personal_access_tokens_table',1),(2,'2026_01_01_000001_create_families_table',1),(3,'2026_01_01_000002_create_users_table',1),(4,'2026_01_01_000003_create_school_classes_table',1),(5,'2026_01_01_000004_create_students_table',1),(6,'2026_01_01_000005_create_fee_settings_table',1),(7,'2026_01_01_000006_create_payments_table',1),(8,'2026_01_01_000007_create_term_periods_and_term_payments_table',1),(9,'2026_01_01_000008_create_notifications_table',1),(10,'2026_01_01_000009_create_audit_logs_table',1),(11,'2026_01_01_000010_create_settings_table',1),(12,'2026_09_15_000011_add_is_active_and_module_permissions',1),(13,'2026_09_17_000012_add_school_year_to_payments_table',1),(14,'2026_09_17_000013_add_name_columns_to_users_and_students',1),(15,'2026_09_19_000014_add_period_windows_and_virement',1),(16,'2026_09_19_000015_add_photo_to_students_and_ref_to_notifications',1);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `module_permissions`
--

DROP TABLE IF EXISTS `module_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `module_permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `module` varchar(255) NOT NULL,
  `can_read` tinyint(1) NOT NULL DEFAULT 0,
  `can_create` tinyint(1) NOT NULL DEFAULT 0,
  `can_update` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_permissions_user_id_module_unique` (`user_id`,`module`),
  CONSTRAINT `module_permissions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `module_permissions`
--

LOCK TABLES `module_permissions` WRITE;
/*!40000 ALTER TABLE `module_permissions` DISABLE KEYS */;
INSERT INTO `module_permissions` VALUES (1,2,'dashboard',1,0,0,0,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,2,'familles',1,1,1,0,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,2,'paiements',1,1,1,0,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,2,'journal',1,0,0,0,'2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `module_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `ref` varchar(255) DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_foreign` (`user_id`),
  KEY `notifications_ref_index` (`ref`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,3,'Bienvenue sur NTSHIK','Votre espace famille est prêt. Vous pouvez inscrire vos enfants et suivre les paiements.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(2,3,'Nouvelle année scolaire','Les frais de l’année 2026-2027 sont disponibles. Pensez à confirmer la place de vos enfants.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,4,'Réduction familiale appliquée','Votre famille de 4 enfants bénéficie de 500 $ de réduction sur le minerval.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(4,5,'Réduction familiale appliquée','Votre famille de 5 enfants bénéficie de 1 000 $ de réduction sur le minerval.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(5,6,'6e enfant exonéré','Votre famille compte 6 enfants : le dernier inscrit bénéficie de l’exonération du minerval.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(6,6,'Paiement en attente','Une tranche 1 d’Emmanuel attend la confirmation de l’administration.',NULL,NULL,'2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `reference` varchar(255) NOT NULL,
  `family_id` bigint(20) unsigned NOT NULL,
  `student_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(30) NOT NULL DEFAULT 'especes',
  `date` date NOT NULL,
  `term` tinyint(3) unsigned DEFAULT NULL,
  `category` varchar(255) NOT NULL DEFAULT 'fee',
  `school_year` varchar(20) DEFAULT NULL,
  `status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_reference_unique` (`reference`),
  KEY `payments_family_id_foreign` (`family_id`),
  KEY `payments_student_id_foreign` (`student_id`),
  KEY `payments_school_year_index` (`school_year`),
  CONSTRAINT `payments_family_id_foreign` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payments_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,'REC-2026-000101',1,1,200.00,'especes','2026-09-01',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(2,'REC-2026-000102',1,1,1000.00,'mobile_money','2026-09-01',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,'REC-2026-000103',1,2,200.00,'especes','2026-09-02',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(4,'REC-2026-000104',1,2,1700.00,'especes','2026-09-02',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(5,'REC-2026-000105',2,3,200.00,'guichet','2026-09-03',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(6,'REC-2026-000106',2,3,1000.00,'mobile_money','2026-09-03',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(7,'REC-2026-000107',2,4,200.00,'especes','2026-09-05',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(8,'REC-2026-000108',2,4,1300.00,'mobile_money','2026-09-06',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(9,'REC-2026-000109',2,6,200.00,'especes','2026-09-10',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(10,'REC-2026-000110',3,7,200.00,'especes','2026-09-07',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(11,'REC-2026-000111',3,7,1000.00,'carte','2026-09-07',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(12,'REC-2026-000112',3,8,200.00,'especes','2026-09-08',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(13,'REC-2026-000113',3,8,1000.00,'virement','2026-09-08',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(14,'REC-2026-000114',3,9,200.00,'especes','2026-09-09',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(15,'REC-2026-000115',3,9,1300.00,'mobile_money','2026-09-09',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(16,'REC-2026-000116',3,10,200.00,'especes','2026-09-12',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(17,'REC-2026-000117',3,10,1700.00,'mobile_money','2026-09-12',1,'tranche1','2026-2027','pending','2026-09-19 08:58:35','2026-09-19 08:58:35'),(18,'REC-2026-000118',4,12,200.00,'especes','2026-09-13',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(19,'REC-2026-000119',4,12,1000.00,'especes','2026-09-13',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(20,'REC-2026-000120',4,13,200.00,'mobile_money','2026-09-14',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(21,'REC-2026-000121',4,13,1300.00,'especes','2026-09-14',1,'tranche1','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(22,'REC-2026-000122',4,15,200.00,'especes','2026-09-15',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35'),(23,'REC-2026-000123',4,16,200.00,'carte','2026-09-16',NULL,'inscription','2026-2027','confirmed','2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personal_access_tokens`
--

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `school_classes`
--

DROP TABLE IF EXISTS `school_classes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `school_classes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `level` varchar(255) NOT NULL,
  `tranche1` decimal(8,2) NOT NULL DEFAULT 0.00,
  `tranche2` decimal(8,2) NOT NULL DEFAULT 0.00,
  `tranche3` decimal(8,2) NOT NULL DEFAULT 0.00,
  `books` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_classes_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `school_classes`
--

LOCK TABLES `school_classes` WRITE;
/*!40000 ALTER TABLE `school_classes` DISABLE KEYS */;
INSERT INTO `school_classes` VALUES (1,'PS','Préscolaire',1000.00,700.00,700.00,110.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'MS','Préscolaire',1000.00,700.00,700.00,200.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,'GS','Préscolaire',1000.00,700.00,700.00,200.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,'CP','Primaire',1000.00,700.00,700.00,0.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(5,'CE1','Primaire',1300.00,900.00,800.00,420.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(6,'CE2','Primaire',1300.00,900.00,800.00,420.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(7,'CM1','Primaire',1300.00,900.00,800.00,420.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(8,'CM2','Primaire',1300.00,900.00,800.00,420.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(9,'6e','Primaire',1700.00,950.00,850.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(10,'7e','Secondaire',1700.00,950.00,850.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(11,'8e','Secondaire',1700.00,950.00,850.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(12,'3e','Secondaire',1700.00,1400.00,1100.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(13,'2de','Secondaire',1700.00,1400.00,1100.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(14,'1re','Secondaire',1700.00,1400.00,1100.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(15,'Terminale IB','Secondaire',2000.00,1750.00,1550.00,400.00,'2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `school_classes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`value`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'school_name','\"Complexe Scolaire Bel Avenir\"','2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'school_year','\"2026-2027\"','2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,'current_term','1','2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,'discount_rules','{\"byCount\":{\"4\":500,\"5\":1000},\"exemptSixth\":true}','2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `students` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `postnom` varchar(255) DEFAULT NULL,
  `gender` varchar(255) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `birth_place` varchar(255) DEFAULT NULL,
  `family_id` bigint(20) unsigned NOT NULL,
  `class_id` bigint(20) unsigned NOT NULL,
  `matricule` varchar(255) NOT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `is_exempt` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_matricule_unique` (`matricule`),
  KEY `students_family_id_foreign` (`family_id`),
  KEY `students_class_id_foreign` (`class_id`),
  CONSTRAINT `students_class_id_foreign` FOREIGN KEY (`class_id`) REFERENCES `school_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `students_family_id_foreign` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (1,'Ruth','Renedy','Bahati','F','2015-01-15','Goma',1,4,'2026-0001',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(2,'Idrissa','Renedy',NULL,'M','2015-02-15','Goma',1,9,'2026-0002',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,'Grace','Clarisse','Mateso','F','2015-03-15','Goma',2,2,'2026-0003',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(4,'Benjamin','Clarisse',NULL,'M','2015-04-15','Goma',2,5,'2026-0004',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(5,'Naomi','Clarisse','Akili','F','2015-05-15','Goma',2,8,'2026-0005',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(6,'Daniel','Clarisse',NULL,'M','2015-06-15','Goma',2,12,'2026-0006',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(7,'Job','Katembo',NULL,'M','2015-07-15','Goma',3,1,'2026-0007',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(8,'Sarah','Katembo','Amani','F','2015-08-15','Goma',3,4,'2026-0008',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(9,'Esther','Katembo',NULL,'F','2015-09-15','Goma',3,7,'2026-0009',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(10,'Emmanuel','Katembo',NULL,'M','2015-10-15','Goma',3,11,'2026-0010',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(11,'Divine','Katembo','Chance','F','2015-11-15','Goma',3,14,'2026-0011',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(12,'Patience','Mbuyi',NULL,'F','2015-12-15','Goma',4,3,'2026-0012',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(13,'Rachel','Mbuyi','Kavira','F','2015-01-15','Goma',4,6,'2026-0013',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(14,'Samuel','Mbuyi',NULL,'M','2015-02-15','Goma',4,10,'2026-0014',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(15,'Anne','Mbuyi','Neema','F','2015-03-15','Goma',4,15,'2026-0015',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(16,'Moise','Mbuyi',NULL,'M','2015-04-15','Goma',4,9,'2026-0016',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35'),(17,'Josué','Mbuyi',NULL,'M','2015-05-15','Goma',4,13,'2026-0017',NULL,0,'active','2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `term_payments`
--

DROP TABLE IF EXISTS `term_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `term_payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint(20) unsigned NOT NULL,
  `label` varchar(255) NOT NULL,
  `amount` decimal(8,2) NOT NULL,
  `due_date` date NOT NULL,
  `paid_fraction` decimal(8,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `term_payments_term_id_foreign` (`term_id`),
  CONSTRAINT `term_payments_term_id_foreign` FOREIGN KEY (`term_id`) REFERENCES `term_periods` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `term_payments`
--

LOCK TABLES `term_payments` WRITE;
/*!40000 ALTER TABLE `term_payments` DISABLE KEYS */;
INSERT INTO `term_payments` VALUES (1,1,'Minerval Tranche 1',150.00,'2026-12-19',0.00,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,2,'Minerval Tranche 2',150.00,'2026-12-04',0.00,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,3,'Minerval Tranche 3',150.00,'2027-03-16',0.00,'2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `term_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `term_periods`
--

DROP TABLE IF EXISTS `term_periods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `term_periods` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `term` tinyint(3) unsigned NOT NULL,
  `due_date` date DEFAULT NULL,
  `opens_at` date DEFAULT NULL,
  `closes_at` date DEFAULT NULL,
  `at_enrollment` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `term_periods_term_unique` (`term`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `term_periods`
--

LOCK TABLES `term_periods` WRITE;
/*!40000 ALTER TABLE `term_periods` DISABLE KEYS */;
INSERT INTO `term_periods` VALUES (1,'Tranche 1',1,NULL,NULL,NULL,1,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'Tranche 2',2,'2026-12-04','2026-08-20','2026-12-04',0,'2026-09-19 08:58:35','2026-09-19 08:58:35'),(3,'Tranche 3',3,'2027-03-16','2026-12-06','2027-03-16',0,'2026-09-19 08:58:35','2026-09-19 08:58:35');
/*!40000 ALTER TABLE `term_periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `postnom` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'family',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `family_id` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_family_id_foreign` (`family_id`),
  CONSTRAINT `users_family_id_foreign` FOREIGN KEY (`family_id`) REFERENCES `families` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Claudel MWAMBA','Claudel','MWAMBA',NULL,'admin@ntshik.cd','$2y$10$3HkVl8bBnWa2MwItxplB4e.aPZDiVsSjAM/NZZ..6cP/9QFxdpWiO','superadmin',1,NULL,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(2,'Renedy Kabeya','Renedy','Kabeya',NULL,'admin2@ntshik.cd','$2y$10$ijXj.bblkYAsB1/xQ7zPX.WT3bhp848ZPTMn.vddKwTjeXyRrXw.6','admin',1,NULL,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(3,'Renedy Karume','Renedy','Karume',NULL,'renedy@ntshik.cd','$2y$10$R8fyf7w23F5ZevwJBSHFwOfgbLwc3sjCCSaHdfWQtJLk7yJxwoyJy','family',1,1,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(4,'Clarisse Kabasele','Clarisse','Kabasele',NULL,'clarisse@ntshik.cd','$2y$10$VzIgSshgnlL7ryptNl9sE.hRy/3yIVk0rZDEQOsboy5lrKRTTDfFO','family',1,2,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(5,'Joseph Katembo','Joseph','Katembo',NULL,'joseph@ntshik.cd','$2y$10$hF238k70gzVEoAjzRi00mO5mI5PpBkNVYniZHy.TQ7KPwYq36QE.O','family',1,3,'2026-09-19 08:58:34','2026-09-19 08:58:34'),(6,'Louange Mbuyi','Louange','Mbuyi',NULL,'mbuyi@ntshik.cd','$2y$10$Xq1vVgA04yRCn9Dh9dw0JOWbvla3hRvb5Hf1HMU./uSiXnZgJ.p8a','family',1,4,'2026-09-19 08:58:34','2026-09-19 08:58:34');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-19  9:58:39
