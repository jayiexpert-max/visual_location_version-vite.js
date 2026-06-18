-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 11, 2026 at 07:57 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `visual_inventory_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_query_cache`
--

CREATE TABLE `ai_query_cache` (
  `id` int(11) NOT NULL,
  `question_hash` char(64) NOT NULL,
  `original_question` text NOT NULL,
  `generated_sql` text NOT NULL,
  `hit_count` int(11) DEFAULT 1,
  `last_hit` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `setting_key` varchar(64) NOT NULL,
  `setting_value` varchar(255) NOT NULL DEFAULT '',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `app_settings`
--

INSERT INTO `app_settings` (`setting_key`, `setting_value`, `updated_at`, `updated_by`) VALUES
('fifo_dummy_im', 'DUMMYBATCH', '2026-06-06 06:11:32', NULL),
('fifo_issue_mode', 'expiration_date', '2026-06-06 06:11:32', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `app_settings_log`
--

CREATE TABLE `app_settings_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `setting_key` varchar(64) NOT NULL,
  `old_value` varchar(255) NOT NULL DEFAULT '',
  `new_value` varchar(255) NOT NULL DEFAULT '',
  `changed_by` int(11) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bom_items`
--

CREATE TABLE `bom_items` (
  `id` int(11) NOT NULL COMMENT 'รหัสรายการ BOM (PK)',
  `revision_id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (FK -> model_revisions)',
  `material_id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (FK -> materials)',
  `qty` decimal(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'จำนวนวัสดุที่ต้องใช้ต่อ 1 ชิ้นงาน',
  `item_list` varchar(255) NOT NULL,
  `unit` varchar(50) NOT NULL DEFAULT 'PC',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น วัสดุทดแทน, หมายเหตุพิเศษ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการวัตถุดิบ (BOM) - ข้อมูลวัสดุที่ต้องใช้ในแต่ละรุ่นงาน';

--
-- Dumping data for table `bom_items`
--

INSERT INTO `bom_items` (`id`, `revision_id`, `material_id`, `qty`, `item_list`, `unit`, `remark`) VALUES
(124, 8, 87, 1.0000, '0010', 'PC', NULL),
(125, 8, 88, 2.0000, '0020', 'PC', NULL),
(126, 8, 8, 0.0200, '0030', 'G', NULL),
(128, 10, 88, 2.0000, '0020', 'PC', NULL),
(129, 10, 8, 0.0200, '0030', 'G', NULL),
(130, 10, 87, 1.0000, '0010', 'PC', NULL),
(171, 13, 92, 1.0000, '0010', 'PC', NULL),
(172, 13, 90, 0.0000, '0011', 'PC', NULL),
(173, 13, 91, 1.0000, '0020', 'PC', NULL),
(174, 13, 76, 5.0000, '0030', 'PC', NULL),
(175, 13, 41, 2.0000, '0040', 'PC', NULL),
(176, 13, 96, 2.0000, '0050', 'PC', NULL),
(177, 13, 40, 1.0000, '0060', 'PC', NULL),
(178, 13, 98, 1.0000, '0070', 'PC', NULL),
(179, 13, 99, 4.0000, '0080', 'PC', NULL),
(180, 13, 100, 1.0000, '0090', 'PC', NULL),
(181, 13, 101, 12.0000, '0100', 'PC', NULL),
(182, 13, 43, 1.0000, '0110', 'PC', NULL),
(183, 13, 44, 1.0000, '0120', 'PC', NULL),
(184, 13, 30, 7.0000, '0130', 'PC', NULL),
(185, 13, 105, 3.0000, '0140', 'PC', NULL),
(186, 13, 106, 2.0000, '0150', 'PC', NULL),
(187, 13, 20, 2.0000, '0160', 'PC', NULL),
(188, 13, 108, 1.0000, '0170', 'PC', NULL),
(189, 13, 109, 2.0000, '0180', 'PC', NULL),
(190, 13, 110, 0.0000, '0181', 'PC', NULL),
(191, 13, 111, 1.0000, '0190', 'PC', NULL),
(192, 13, 112, 1.0000, '0200', 'PC', NULL),
(193, 13, 113, 0.0000, '0201', 'PC', NULL),
(194, 13, 34, 2.0000, '0210', 'PC', NULL),
(195, 13, 115, 1.0000, '0220', 'PC', NULL),
(196, 13, 116, 1.0000, '0230', 'PC', NULL),
(197, 13, 117, 1.0000, '0240', 'PC', NULL),
(198, 13, 118, 1.0000, '0250', 'PC', NULL),
(199, 13, 119, 2.0000, '0260', 'PC', NULL),
(200, 13, 120, 2.0000, '0270', 'PC', NULL),
(201, 13, 121, 0.0000, '0271', 'PC', NULL),
(202, 13, 47, 1.0000, '0280', 'PC', NULL),
(203, 13, 123, 1.0000, '0290', 'PC', NULL),
(204, 13, 124, 1.0000, '0300', 'PC', NULL),
(205, 13, 125, 0.0000, '0301', 'PC', NULL),
(206, 13, 8, 0.0486, '0310', 'G', NULL),
(207, 13, 127, 2.0000, '0320', 'PC', NULL),
(208, 13, 128, 2.0000, '0330', 'PC', NULL),
(209, 13, 129, 0.0000, '0331', 'PC', NULL),
(210, 13, 130, 2.0000, '0340', 'PC', NULL),
(211, 14, 131, 0.0000, '0010', 'PC', NULL),
(212, 14, 132, 1.0000, '0011', 'PC', NULL),
(213, 14, 29, 0.0000, '0020', 'PC', NULL),
(214, 14, 30, 8.0000, '0021', 'PC', NULL),
(215, 14, 135, 1.0000, '0030', 'PC', NULL),
(216, 14, 108, 0.0000, '0031', 'PC', NULL),
(217, 14, 110, 0.0000, '0040', 'PC', NULL),
(218, 14, 109, 2.0000, '0041', 'PC', NULL),
(219, 14, 113, 0.0000, '0050', 'PC', NULL),
(220, 14, 112, 2.0000, '0051', 'PC', NULL),
(221, 14, 141, 1.0000, '0060', 'PC', NULL),
(222, 14, 115, 0.0000, '0061', 'PC', NULL),
(223, 14, 143, 0.0000, '0070', 'PC', NULL),
(224, 14, 116, 1.0000, '0071', 'PC', NULL),
(225, 14, 145, 1.0000, '0090', 'PC', NULL),
(226, 14, 146, 0.0000, '0100', 'PC', NULL),
(227, 14, 106, 2.0000, '0101', 'PC', NULL),
(228, 14, 19, 0.0000, '0110', 'PC', NULL),
(229, 14, 20, 2.0000, '0111', 'PC', NULL),
(230, 14, 91, 1.0000, '0120', 'PC', NULL),
(231, 14, 118, 1.0000, '0130', 'PC', NULL),
(232, 14, 152, 0.0000, '0140', 'PC', NULL),
(233, 14, 119, 2.0000, '0141', 'PC', NULL),
(234, 14, 121, 0.0000, '0150', 'PC', NULL),
(235, 14, 120, 2.0000, '0151', 'PC', NULL),
(236, 14, 156, 0.0000, '0160', 'PC', NULL),
(237, 14, 157, 1.0000, '0161', 'PC', NULL),
(238, 14, 123, 1.0000, '0170', 'PC', NULL),
(239, 14, 125, 0.0000, '0180', 'PC', NULL),
(240, 14, 124, 1.0000, '0181', 'PC', NULL),
(241, 14, 76, 2.0000, '0190', 'PC', NULL),
(242, 14, 162, 2.0000, '0200', 'PC', NULL),
(243, 14, 163, 1.0000, '0210', 'PC', NULL),
(244, 14, 164, 3.0000, '0220', 'PC', NULL),
(245, 14, 37, 3.0000, '0230', 'PC', NULL),
(246, 14, 166, 1.0000, '0240', 'PC', NULL),
(247, 14, 96, 2.0000, '0250', 'PC', NULL),
(248, 14, 41, 1.0000, '0260', 'PC', NULL),
(249, 14, 169, 2.0000, '0270', 'PC', NULL),
(250, 14, 170, 1.0000, '0290', 'PC', NULL),
(251, 14, 171, 2.0000, '0300', 'PC', NULL),
(252, 14, 172, 2.0000, '0310', 'PC', NULL),
(253, 14, 173, 1.0000, '0320', 'PC', NULL),
(254, 14, 117, 1.0000, '0330', 'PC', NULL),
(255, 14, 175, 0.0000, '0340', 'PC', NULL),
(256, 14, 105, 2.0000, '0341', 'PC', NULL),
(257, 14, 8, 0.0490, '0360', 'G', NULL),
(258, 14, 177, 0.0000, '0420', 'G', NULL),
(259, 14, 178, 0.0000, '0421', 'G', NULL),
(260, 14, 179, 0.0000, '0370', 'PC', NULL),
(261, 14, 180, 0.0000, '0380', 'PC', NULL),
(262, 14, 181, 0.0000, '0390', 'PC', NULL),
(263, 14, 182, 0.0000, '0400', 'PC', NULL),
(264, 14, 183, 0.0000, '0410', 'PC', NULL),
(265, 15, 9, 0.0000, '0010', 'PC', NULL),
(266, 15, 10, 1.0000, '0011', 'PC', NULL),
(267, 15, 2, 1.0000, '0020', 'PC', NULL),
(268, 15, 4, 1.0000, '0030', 'PC', NULL),
(269, 15, 14, 2.0000, '0040', 'PC', NULL),
(270, 15, 16, 2.0000, '0050', 'PC', NULL),
(271, 15, 18, 1.0000, '0060', 'PC', NULL),
(272, 15, 20, 3.0000, '0070', 'PC', NULL),
(273, 15, 22, 2.0000, '0080', 'PC', NULL),
(274, 15, 24, 1.0000, '0090', 'PC', NULL),
(275, 15, 26, 2.0000, '0100', 'PC', NULL),
(276, 15, 28, 2.0000, '0110', 'PC', NULL),
(277, 15, 30, 4.0000, '0120', 'PC', NULL),
(278, 15, 32, 1.0000, '0130', 'PC', NULL),
(279, 15, 34, 2.0000, '0140', 'PC', NULL),
(280, 15, 36, 1.0000, '0150', 'PC', NULL),
(281, 15, 37, 1.0000, '0160', 'PC', NULL),
(282, 15, 38, 1.0000, '0170', 'PC', NULL),
(283, 15, 39, 1.0000, '0180', 'PC', NULL),
(284, 15, 40, 1.0000, '0190', 'PC', NULL),
(285, 15, 41, 1.0000, '0200', 'PC', NULL),
(286, 15, 42, 1.0000, '0210', 'PC', NULL),
(287, 15, 43, 1.0000, '0220', 'PC', NULL),
(288, 15, 44, 1.0000, '0230', 'PC', NULL),
(289, 15, 45, 1.0000, '0240', 'PC', NULL),
(290, 15, 46, 3.0000, '0250', 'PC', NULL),
(291, 15, 47, 1.0000, '0260', 'PC', NULL),
(292, 15, 48, 2.0000, '0270', 'PC', NULL),
(293, 15, 51, 1.0000, '0280', 'PC', NULL),
(294, 15, 8, 0.0490, '0290', 'G', NULL),
(295, 16, 52, 0.0000, '0010', 'PC', NULL),
(296, 16, 53, 1.0000, '0011', 'PC', NULL),
(297, 16, 2, 1.0000, '0020', 'PC', NULL),
(298, 16, 4, 1.0000, '0030', 'PC', NULL),
(299, 16, 14, 2.0000, '0040', 'PC', NULL),
(300, 16, 16, 2.0000, '0050', 'PC', NULL),
(301, 16, 18, 1.0000, '0060', 'PC', NULL),
(302, 16, 20, 3.0000, '0070', 'PC', NULL),
(303, 16, 22, 2.0000, '0080', 'PC', NULL),
(304, 16, 24, 1.0000, '0090', 'PC', NULL),
(305, 16, 26, 2.0000, '0100', 'PC', NULL),
(306, 16, 63, 1.0000, '0110', 'PC', NULL),
(307, 16, 28, 2.0000, '0120', 'PC', NULL),
(308, 16, 30, 8.0000, '0130', 'PC', NULL),
(309, 16, 34, 2.0000, '0140', 'PC', NULL),
(310, 16, 36, 1.0000, '0150', 'PC', NULL),
(311, 16, 37, 1.0000, '0160', 'PC', NULL),
(312, 16, 39, 1.0000, '0170', 'PC', NULL),
(313, 16, 40, 1.0000, '0180', 'PC', NULL),
(314, 16, 41, 6.0000, '0190', 'PC', NULL),
(315, 16, 42, 1.0000, '0200', 'PC', NULL),
(316, 16, 73, 1.0000, '0210', 'PC', NULL),
(317, 16, 74, 4.0000, '0220', 'PC', NULL),
(318, 16, 75, 1.0000, '0230', 'PC', NULL),
(319, 16, 76, 1.0000, '0240', 'PC', NULL),
(320, 16, 45, 1.0000, '0250', 'PC', NULL),
(321, 16, 46, 3.0000, '0260', 'PC', NULL),
(322, 16, 48, 2.0000, '0270', 'PC', NULL),
(323, 16, 80, 1.0000, '0280', 'PC', NULL),
(324, 16, 81, 1.0000, '0290', 'PC', NULL),
(325, 16, 51, 1.0000, '0300', 'PC', NULL),
(326, 16, 83, 3.0000, '0310', 'PC', NULL),
(327, 16, 84, 1.0000, '0320', 'PC', NULL),
(328, 16, 85, 1.0000, '0330', 'PC', NULL),
(329, 16, 8, 0.0560, '0340', 'G', NULL),
(375, 18, 9, 0.0000, '0010', 'PC', NULL),
(376, 18, 10, 1.0000, '0011', 'PC', NULL),
(377, 18, 1, 1.0000, '0030', 'PC', NULL),
(378, 18, 8, 0.0000, '0320', 'G', NULL),
(379, 18, 2, 1.0000, '0020', 'PC', NULL),
(380, 18, 3, 0.0000, '0040', 'PC', NULL),
(381, 18, 4, 1.0000, '0041', 'PC', NULL),
(382, 18, 13, 0.0000, '0050', 'PC', NULL),
(383, 18, 14, 2.0000, '0051', 'PC', NULL),
(384, 18, 15, 0.0000, '0060', 'PC', NULL),
(385, 18, 16, 2.0000, '0061', 'PC', NULL),
(386, 18, 17, 0.0000, '0070', 'PC', NULL),
(387, 18, 18, 1.0000, '0071', 'PC', NULL),
(388, 18, 19, 0.0000, '0080', 'PC', NULL),
(389, 18, 20, 3.0000, '0081', 'PC', NULL),
(390, 18, 21, 0.0000, '0090', 'PC', NULL),
(391, 18, 22, 2.0000, '0091', 'PC', NULL),
(392, 18, 23, 0.0000, '0100', 'PC', NULL),
(393, 18, 24, 1.0000, '0101', 'PC', NULL),
(394, 18, 25, 0.0000, '0110', 'PC', NULL),
(395, 18, 26, 2.0000, '0111', 'PC', NULL),
(396, 18, 27, 0.0000, '0120', 'PC', NULL),
(397, 18, 28, 2.0000, '0121', 'PC', NULL),
(398, 18, 29, 0.0000, '0130', 'PC', NULL),
(399, 18, 30, 4.0000, '0131', 'PC', NULL),
(400, 18, 31, 0.0000, '0140', 'PC', NULL),
(401, 18, 32, 1.0000, '0141', 'PC', NULL),
(402, 18, 33, 0.0000, '0150', 'PC', NULL),
(403, 18, 34, 5.0000, '0151', 'PC', NULL),
(404, 18, 35, 0.0000, '0160', 'PC', NULL),
(405, 18, 36, 1.0000, '0161', 'PC', NULL),
(406, 18, 37, 1.0000, '0170', 'PC', NULL),
(407, 18, 38, 1.0000, '0180', 'PC', NULL),
(408, 18, 39, 1.0000, '0190', 'PC', NULL),
(409, 18, 40, 1.0000, '0200', 'PC', NULL),
(410, 18, 41, 1.0000, '0210', 'PC', NULL),
(411, 18, 42, 1.0000, '0220', 'PC', NULL),
(412, 18, 43, 1.0000, '0230', 'PC', NULL),
(413, 18, 44, 1.0000, '0240', 'PC', NULL),
(414, 18, 45, 1.0000, '0250', 'PC', NULL),
(415, 18, 46, 3.0000, '0260', 'PC', NULL),
(416, 18, 47, 1.0000, '0270', 'PC', NULL),
(417, 18, 48, 2.0000, '0280', 'PC', NULL),
(418, 18, 49, 2.0000, '0290', 'PC', NULL),
(419, 18, 6, 1.0000, '0300', 'PC', NULL),
(420, 18, 184, 1.0000, '0310', 'PC', NULL),
(424, 21, 86, 1.0000, '0010', 'PC', NULL),
(425, 21, 185, 0.0000, '0011', 'PC', NULL),
(426, 21, 186, 6.0000, '0020', 'PC', NULL),
(427, 21, 187, 1.0000, '0030', 'PC', NULL),
(428, 21, 188, 1.0000, '0040', 'PC', NULL),
(429, 21, 189, 2.0000, '0050', 'PC', NULL),
(430, 21, 190, 3.0000, '0060', 'PC', NULL),
(431, 21, 191, 8.0000, '0070', 'PC', NULL),
(432, 21, 192, 1.0000, '0080', 'PC', NULL),
(433, 21, 193, 1.0000, '0090', 'PC', NULL),
(434, 21, 194, 1.0000, '0100', 'PC', NULL),
(435, 21, 195, 2.0000, '0110', 'PC', NULL),
(436, 21, 196, 1.0000, '0120', 'PC', NULL),
(437, 21, 197, 1.0000, '0130', 'PC', NULL),
(438, 21, 198, 2.0000, '0140', 'PC', NULL),
(439, 21, 199, 1.0000, '0150', 'PC', NULL),
(440, 21, 200, 1.0000, '0160', 'PC', NULL),
(441, 21, 201, 1.0000, '0170', 'PC', NULL),
(442, 21, 202, 1.0000, '0180', 'PC', NULL),
(443, 21, 203, 1.0000, '0190', 'PC', NULL),
(444, 21, 204, 1.0000, '0200', 'PC', NULL),
(445, 21, 205, 1.0000, '0210', 'PC', NULL),
(446, 21, 206, 1.0000, '0220', 'PC', NULL),
(447, 21, 207, 1.0000, '0230', 'PC', NULL),
(448, 21, 208, 4.0000, '0240', 'PC', NULL),
(449, 21, 209, 1.0000, '0250', 'PC', NULL),
(450, 21, 210, 1.0000, '0260', 'PC', NULL),
(451, 21, 211, 1.0000, '0270', 'PC', NULL),
(452, 21, 212, 1.0000, '0280', 'PC', NULL),
(453, 21, 163, 2.0000, '0290', 'PC', NULL),
(454, 21, 214, 1.0000, '0300', 'PC', NULL),
(455, 21, 37, 1.0000, '0310', 'PC', NULL),
(456, 21, 38, 1.0000, '0320', 'PC', NULL),
(457, 21, 162, 1.0000, '0330', 'PC', NULL),
(458, 21, 218, 2.0000, '0340', 'PC', NULL),
(459, 21, 219, 8.0000, '0350', 'PC', NULL),
(460, 21, 220, 1.0000, '0360', 'PC', NULL),
(461, 21, 221, 1.0000, '0370', 'PC', NULL),
(462, 21, 222, 3.0000, '0380', 'PC', NULL),
(463, 21, 39, 1.0000, '0390', 'PC', NULL),
(464, 21, 41, 6.0000, '0400', 'PC', NULL),
(465, 21, 40, 1.0000, '0410', 'PC', NULL),
(466, 21, 226, 1.0000, '0420', 'PC', NULL),
(467, 21, 227, 1.0000, '0430', 'PC', NULL),
(468, 21, 228, 1.0000, '0440', 'PC', NULL),
(469, 21, 229, 2.0000, '0450', 'PC', NULL),
(470, 21, 230, 1.0000, '0460', 'PC', NULL),
(471, 21, 231, 1.0000, '0470', 'PC', NULL),
(472, 21, 232, 0.0000, '0471', 'PC', NULL),
(473, 21, 8, 0.0650, '0520', 'G', NULL),
(474, 21, 233, 1.0000, '0480', 'PC', NULL),
(475, 21, 234, 0.0000, '0481', 'PC', NULL),
(476, 21, 235, 1.0000, '0490', 'PC', NULL),
(477, 21, 236, 1.0000, '0500', 'PC', NULL),
(478, 21, 237, 1.0000, '0510', 'PC', NULL),
(479, 22, 9, 0.0000, '0010', 'PC', NULL),
(480, 22, 10, 1.0000, '0011', 'PC', NULL),
(481, 22, 1, 1.0000, '0030', 'PC', NULL),
(482, 22, 8, 0.0000, '0320', 'G', NULL),
(483, 22, 2, 1.0000, '0020', 'PC', NULL),
(484, 22, 3, 0.0000, '0040', 'PC', NULL),
(485, 22, 4, 1.0000, '0041', 'PC', NULL),
(486, 22, 13, 0.0000, '0050', 'PC', NULL),
(487, 22, 14, 2.0000, '0051', 'PC', NULL),
(488, 22, 15, 0.0000, '0060', 'PC', NULL),
(489, 22, 16, 2.0000, '0061', 'PC', NULL),
(490, 22, 17, 0.0000, '0070', 'PC', NULL),
(491, 22, 18, 1.0000, '0071', 'PC', NULL),
(492, 22, 19, 0.0000, '0080', 'PC', NULL),
(493, 22, 20, 3.0000, '0081', 'PC', NULL),
(494, 22, 21, 0.0000, '0090', 'PC', NULL),
(495, 22, 22, 2.0000, '0091', 'PC', NULL),
(496, 22, 23, 0.0000, '0100', 'PC', NULL),
(497, 22, 24, 1.0000, '0101', 'PC', NULL),
(498, 22, 25, 0.0000, '0110', 'PC', NULL),
(499, 22, 26, 2.0000, '0111', 'PC', NULL),
(500, 22, 27, 0.0000, '0120', 'PC', NULL),
(501, 22, 28, 2.0000, '0121', 'PC', NULL),
(502, 22, 29, 0.0000, '0130', 'PC', NULL),
(503, 22, 30, 4.0000, '0131', 'PC', NULL),
(504, 22, 31, 0.0000, '0140', 'PC', NULL),
(505, 22, 32, 1.0000, '0141', 'PC', NULL),
(506, 22, 33, 0.0000, '0150', 'PC', NULL),
(507, 22, 34, 5.0000, '0151', 'PC', NULL),
(508, 22, 35, 0.0000, '0160', 'PC', NULL),
(509, 22, 36, 1.0000, '0161', 'PC', NULL),
(510, 22, 37, 1.0000, '0170', 'PC', NULL),
(511, 22, 38, 1.0000, '0180', 'PC', NULL),
(512, 22, 39, 1.0000, '0190', 'PC', NULL),
(513, 22, 40, 1.0000, '0200', 'PC', NULL),
(514, 22, 41, 1.0000, '0210', 'PC', NULL),
(515, 22, 42, 1.0000, '0220', 'PC', NULL),
(516, 22, 43, 1.0000, '0230', 'PC', NULL),
(517, 22, 44, 1.0000, '0240', 'PC', NULL),
(518, 22, 45, 1.0000, '0250', 'PC', NULL),
(519, 22, 46, 3.0000, '0260', 'PC', NULL),
(520, 22, 47, 1.0000, '0270', 'PC', NULL),
(521, 22, 48, 2.0000, '0280', 'PC', NULL),
(522, 22, 49, 2.0000, '0290', 'PC', NULL),
(523, 22, 6, 1.0000, '0300', 'PC', NULL),
(524, 22, 51, 1.0000, '0310', 'PC', NULL),
(551, 26, 239, 1.0000, '0010', 'PC', NULL),
(552, 26, 29, 0.0000, '0020', 'PC', NULL),
(553, 26, 30, 10.0000, '0021', 'PC', NULL),
(554, 26, 91, 1.0000, '0030', 'PC', NULL),
(555, 26, 146, 2.0000, '0040', 'PC', NULL),
(556, 26, 106, 0.0000, '0041', 'PC', NULL),
(557, 26, 19, 0.0000, '0050', 'PC', NULL),
(558, 26, 20, 3.0000, '0051', 'PC', NULL),
(559, 26, 135, 1.0000, '0060', 'PC', NULL),
(560, 26, 108, 0.0000, '0061', 'PC', NULL),
(561, 26, 110, 2.0000, '0070', 'PC', NULL),
(562, 26, 109, 0.0000, '0071', 'PC', NULL),
(563, 26, 241, 0.0000, '0080', 'PC', NULL),
(564, 26, 63, 1.0000, '0081', 'PC', NULL),
(565, 26, 243, 1.0000, '0090', 'PC', NULL),
(566, 26, 111, 0.0000, '0091', 'PC', NULL),
(567, 26, 113, 1.0000, '0100', 'PC', NULL),
(568, 26, 112, 0.0000, '0101', 'PC', NULL),
(569, 26, 141, 1.0000, '0110', 'PC', NULL),
(570, 26, 115, 0.0000, '0111', 'PC', NULL),
(571, 26, 143, 1.0000, '0120', 'PC', NULL),
(572, 26, 116, 0.0000, '0121', 'PC', NULL),
(573, 26, 84, 1.0000, '0130', 'PC', NULL),
(574, 26, 152, 2.0000, '0140', 'PC', NULL),
(575, 26, 119, 0.0000, '0141', 'PC', NULL),
(576, 26, 125, 1.0000, '0150', 'PC', NULL),
(577, 26, 124, 0.0000, '0151', 'PC', NULL),
(578, 26, 121, 2.0000, '0160', 'PC', NULL),
(579, 26, 120, 0.0000, '0161', 'PC', NULL),
(580, 26, 123, 1.0000, '0170', 'PC', NULL),
(581, 26, 76, 2.0000, '0180', 'PC', NULL),
(582, 26, 41, 3.0000, '0190', 'PC', NULL),
(583, 26, 73, 1.0000, '0200', 'PC', NULL),
(584, 26, 74, 4.0000, '0210', 'PC', NULL),
(585, 26, 40, 1.0000, '0220', 'PC', NULL),
(586, 26, 75, 1.0000, '0230', 'PC', NULL),
(587, 26, 42, 1.0000, '0240', 'PC', NULL),
(588, 26, 85, 1.0000, '0250', 'PC', NULL),
(589, 26, 118, 1.0000, '0260', 'PC', NULL),
(590, 26, 81, 1.0000, '0270', 'PC', NULL),
(591, 26, 83, 3.0000, '0280', 'PC', NULL),
(592, 26, 96, 1.0000, '0290', 'PC', NULL),
(593, 26, 80, 1.0000, '0300', 'PC', NULL),
(594, 26, 117, 1.0000, '0310', 'PC', NULL),
(595, 26, 175, 2.0000, '0320', 'PC', NULL),
(596, 26, 105, 0.0000, '0321', 'PC', NULL),
(597, 26, 8, 0.0556, '0330', 'G', NULL),
(598, 26, 128, 2.0000, '0340', 'PC', NULL),
(599, 26, 129, 0.0000, '0341', 'PC', NULL),
(600, 26, 130, 2.0000, '0350', 'PC', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `boxes`
--

CREATE TABLE `boxes` (
  `id` int(11) NOT NULL COMMENT 'รหัสกล่อง (PK)',
  `level_id` int(11) DEFAULT NULL COMMENT 'รหัสชั้นที่อยู่ (FK -> levels)',
  `box_code` varchar(50) DEFAULT NULL COMMENT 'รหัสกล่อง เช่น A1, B2',
  `position_in_level` int(11) DEFAULT NULL COMMENT 'ลำดับตำแหน่งบนชั้น',
  `layout` varchar(10) DEFAULT '1x1' COMMENT 'รูปแบบการแบ่งช่อง เช่น 1x1, 2x2',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `io_device_id` int(11) DEFAULT NULL,
  `io_output_pin` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='กล่องเก็บของ (Box) - กล่องที่อยู่บนชั้นวาง';

--
-- Dumping data for table `boxes`
--

INSERT INTO `boxes` (`id`, `level_id`, `box_code`, `position_in_level`, `layout`, `remark`, `io_device_id`, `io_output_pin`) VALUES
(1, 1, '1', NULL, '1x1', NULL, NULL, NULL),
(2, 1, '2', NULL, '1x1', NULL, NULL, NULL),
(3, 2, '1', NULL, '1x1', NULL, NULL, NULL),
(4, 2, '2', NULL, '1x1', NULL, NULL, NULL),
(9, 5, '1', 1, '1x1', NULL, NULL, NULL),
(10, 6, '2', 2, '1x1', NULL, NULL, NULL),
(11, 5, '2', 2, '1x1', NULL, NULL, NULL),
(12, 6, '1', 1, '1x1', NULL, NULL, NULL),
(13, 7, '1', NULL, '1x1', NULL, NULL, NULL),
(14, 7, '2', NULL, '1x1', NULL, NULL, NULL),
(15, 8, '1', NULL, '1x1', NULL, NULL, NULL),
(16, 8, '2', NULL, '1x1', NULL, NULL, NULL),
(17, 9, '1', NULL, '1x1', NULL, NULL, NULL),
(18, 9, '2', NULL, '1x1', NULL, NULL, NULL),
(19, 9, '3', NULL, '1x1', NULL, NULL, NULL),
(20, 10, '1', NULL, '1x1', NULL, NULL, NULL),
(21, 10, '2', NULL, '1x1', NULL, NULL, NULL),
(22, 10, '3', NULL, '1x1', NULL, NULL, NULL),
(23, 11, '1', NULL, '2x4', NULL, NULL, NULL),
(26, 11, '2', NULL, '2x5', NULL, NULL, NULL),
(27, 11, '3', NULL, '1x5', NULL, NULL, NULL),
(28, 12, '1', NULL, '1x1', NULL, NULL, NULL),
(29, 12, '2', NULL, '1x3', NULL, NULL, NULL),
(30, 12, '3', NULL, '2x5', NULL, NULL, NULL),
(31, 13, '1', NULL, '1x1', NULL, NULL, NULL),
(32, 13, '2', NULL, '1x1', NULL, NULL, NULL),
(33, 13, '3', NULL, '1x1', NULL, NULL, NULL),
(34, 13, '4', NULL, '1x1', NULL, NULL, NULL),
(36, 14, '1', NULL, '1x1', NULL, NULL, NULL),
(37, 14, '2', NULL, '1x1', NULL, NULL, NULL),
(38, 15, '1', NULL, '1x1', NULL, NULL, NULL),
(39, 15, '2', NULL, '1x1', NULL, NULL, NULL),
(40, 15, '3', NULL, '1x1', NULL, NULL, NULL),
(41, 15, '4', NULL, '1x1', NULL, NULL, NULL),
(42, 16, '1', NULL, '1x3', NULL, 2, 1),
(43, 16, '2', NULL, '2x8', NULL, 2, 2),
(44, 16, '3', NULL, '1x3', NULL, 2, 3),
(45, 17, '1', NULL, '3x3', NULL, 2, 4),
(46, 17, '2', NULL, '2x5', NULL, 2, 5),
(47, 17, '3', NULL, '3x3', NULL, 2, 6),
(48, 18, '1', NULL, '3x3', NULL, 2, 7),
(49, 18, '2', NULL, '3x3', NULL, 2, 8),
(50, 18, '3', NULL, '2x8', NULL, 2, 9),
(51, 19, '1', NULL, '2x2', NULL, NULL, NULL),
(52, 19, '2', NULL, '2x2', NULL, NULL, NULL),
(53, 19, '3', NULL, '2x2', NULL, NULL, NULL),
(54, 20, '1', NULL, '1x1', NULL, NULL, NULL),
(55, 20, '2', NULL, '1x1', NULL, NULL, NULL),
(56, 21, '1', NULL, '1x1', NULL, NULL, NULL),
(57, 21, '2', NULL, '1x1', NULL, NULL, NULL),
(58, 21, '3', NULL, '1x1', NULL, NULL, NULL),
(59, 22, '1', NULL, '1x1', NULL, NULL, NULL),
(60, 22, '2', NULL, '1x1', NULL, NULL, NULL),
(61, 23, '1', NULL, '1x1', NULL, NULL, NULL),
(62, 23, '2', NULL, '1x1', NULL, NULL, NULL),
(63, 2, '3', NULL, '1x1', NULL, NULL, NULL),
(64, 3, '1', NULL, '1x1', NULL, NULL, NULL),
(65, 13, '5', NULL, '1x3', NULL, NULL, NULL),
(66, 8, '3', NULL, '1x1', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `chat_messages`
--

CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL COMMENT 'รหัสข้อความ (PK)',
  `sender` varchar(255) NOT NULL COMMENT 'ชื่อผู้ส่ง',
  `receiver` varchar(255) NOT NULL COMMENT 'ชื่อผู้รับ',
  `message` text NOT NULL COMMENT 'เนื้อหาข้อความ',
  `timestamp` datetime DEFAULT current_timestamp() COMMENT 'วันเวลาที่ส่ง',
  `is_read` tinyint(1) DEFAULT 0 COMMENT 'อ่านแล้วหรือยัง (0=ยังไม่อ่าน, 1=อ่านแล้ว)',
  `msg_type` varchar(50) DEFAULT 'text' COMMENT 'ประเภทข้อความ เช่น text, image',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ข้อความแชท - ประวัติการสนทนาในระบบ';

-- --------------------------------------------------------

--
-- Table structure for table `chat_users`
--

CREATE TABLE `chat_users` (
  `id` int(11) NOT NULL COMMENT 'รหัสผู้ใช้แชท (PK)',
  `username` varchar(255) NOT NULL COMMENT 'ชื่อผู้ใช้',
  `last_active` datetime DEFAULT current_timestamp() COMMENT 'เวลาที่ออนไลน์ล่าสุด',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ผู้ใช้แชท - ข้อมูลผู้ใช้ระบบแชทภายใน';

-- --------------------------------------------------------

--
-- Table structure for table `ethernet_ios`
--

CREATE TABLE `ethernet_ios` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `ip_address` varchar(50) NOT NULL,
  `port` int(11) DEFAULT 80,
  `controller_type` varchar(50) DEFAULT 'http',
  `url_format` varchar(255) DEFAULT 'http://{IP}:{PORT}/relay.cgi?relay={PIN}&state={STATE}',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `inputs` int(11) DEFAULT 16,
  `outputs` int(11) DEFAULT 16
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ethernet_ios`
--

INSERT INTO `ethernet_ios` (`id`, `name`, `ip_address`, `port`, `controller_type`, `url_format`, `created_at`, `inputs`, `outputs`) VALUES
(2, 'IO1', '192.168.113.18', 8080, 'raspi', 'http://{IP}:{PORT}/api/io/highlight', '2026-06-04 09:19:19', 16, 16);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_receive`
--

CREATE TABLE `inventory_receive` (
  `id` int(11) NOT NULL COMMENT 'รหัสการรับสินค้า (PK)',
  `ReceiveDate` datetime DEFAULT NULL COMMENT 'วันที่รับสินค้าเข้าคลัง',
  `PUID` varchar(50) DEFAULT NULL COMMENT 'รหัสเฉพาะของสินค้า (Unique ID)',
  `ReservationNo` varchar(50) DEFAULT NULL,
  `IM` varchar(50) DEFAULT NULL COMMENT 'เลขที่ใบรับวัสดุ (Incoming Material)',
  `Customer` varchar(50) DEFAULT NULL COMMENT 'ชื่อลูกค้า/ผู้ส่ง',
  `HanaPart` varchar(50) DEFAULT NULL COMMENT 'รหัสพาร์ท Hana (ตรงกับ material_code)',
  `Description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดสินค้า',
  `MnfPartNo` varchar(100) DEFAULT NULL COMMENT 'รหัสพาร์ทของผู้ผลิต',
  `LotNo` varchar(100) DEFAULT NULL COMMENT 'หมายเลขล็อต',
  `DateCode` varchar(50) DEFAULT NULL COMMENT 'รหัสวันผลิต',
  `BinSize` varchar(50) DEFAULT NULL COMMENT 'ขนาดถาด/กล่องบรรจุ',
  `Qty` int(11) DEFAULT NULL COMMENT 'จำนวนที่รับเข้ามา',
  `QtyRemain` int(11) DEFAULT NULL COMMENT 'จำนวนคงเหลือปัจจุบัน',
  `McID` int(11) DEFAULT NULL COMMENT 'รหัสเครื่องจักร',
  `MachineName` varchar(255) DEFAULT NULL COMMENT 'ชื่อเครื่องจักร/สถานที่ใช้งาน',
  `StatusName` varchar(50) DEFAULT NULL COMMENT 'สถานะสินค้า เช่น Available, Restricted',
  `ExpirationDate` datetime DEFAULT NULL COMMENT 'วันหมดอายุ',
  `OldIM` varchar(50) DEFAULT NULL COMMENT 'เลขที่ IM เก่า (กรณีโอนย้าย)',
  `Remark` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุ เช่น งานด่วน, รอตรวจสอบ',
  `Loc_Shelf` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขตู้/ชั้นวาง',
  `Loc_Level` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขชั้น',
  `Loc_Box` varchar(50) DEFAULT NULL COMMENT 'ตำแหน่ง: หมายเลขกล่อง',
  `ExpireDate_RoomTemp` datetime DEFAULT NULL COMMENT 'วันหมดอายุ (อุณหภูมิห้อง)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างข้อมูล',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'วันเวลาที่แก้ไขล่าสุด'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รับสินค้าเข้าคลัง - ข้อมูลการรับวัสดุเข้าสต็อก รวมวันหมดอายุ';

--
-- Dumping data for table `inventory_receive`
--

INSERT INTO `inventory_receive` (`id`, `ReceiveDate`, `PUID`, `ReservationNo`, `IM`, `Customer`, `HanaPart`, `Description`, `MnfPartNo`, `LotNo`, `DateCode`, `BinSize`, `Qty`, `QtyRemain`, `McID`, `MachineName`, `StatusName`, `ExpirationDate`, `OldIM`, `Remark`, `Loc_Shelf`, `Loc_Level`, `Loc_Box`, `ExpireDate_RoomTemp`, `created_at`, `updated_at`) VALUES
(1, '2026-06-09 10:56:00', '08DTQ3', '', '2026011500-1', 'IST', '1061ISTD4000093', 'DIODE TVS SINGLE UNI-DIR 30V 600W RoHS', 'SMBJ30A', '5FJN51KB-0615-08', '2526', '0', 3000, 2842, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-06-27 00:00:00', '', '', '1', '2', '1', NULL, '2026-06-09 08:56:43', '2026-06-09 08:56:43'),
(2, '2026-06-09 10:56:00', '08G5J1', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:57:08', '2026-06-09 08:57:08'),
(3, '2026-06-09 10:57:00', '08G5J2', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:57:34', '2026-06-09 08:57:34'),
(4, '2026-06-09 10:57:00', '08G5IW', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:57:57', '2026-06-09 08:57:57'),
(5, '2026-06-09 10:57:00', '08G5IY', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:58:29', '2026-06-09 08:58:29'),
(6, '2026-06-09 10:58:00', '08G5J5', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:58:41', '2026-06-09 08:58:41'),
(7, '2026-06-09 10:58:00', '08G5J0', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:58:59', '2026-06-09 08:58:59'),
(8, '2026-06-09 10:59:00', '08G5J6', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:59:14', '2026-06-09 08:59:14'),
(9, '2026-06-09 10:59:00', '08G5IB', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 08:59:28', '2026-06-09 08:59:28'),
(10, '2026-06-09 10:59:00', '08G5IF', '', '2026022700-1', 'IST', '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', '430182070816', '265510122544000', '20251027', '0', 550, 550, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-27 00:00:00', '', '', '1', '2', '2', NULL, '2026-06-09 09:00:11', '2026-06-09 09:00:11'),
(11, '2026-06-09 11:00:00', '08BRC4', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK5TX', '2547', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:00:27', '2026-06-11 00:47:27'),
(12, '2026-06-09 11:00:00', '08BRC3', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK5TX', '2547', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:00:41', '2026-06-09 16:09:57'),
(13, '2026-06-09 11:00:00', '08BRE9', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK4UE', '2546', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:00:52', '2026-06-09 16:09:54'),
(14, '2026-06-09 11:00:00', '08BREA', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK4UE', '2546', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:01:05', '2026-06-09 16:08:55'),
(15, '2026-06-09 11:01:00', '08BRE7', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK4UE', '2546', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:01:16', '2026-06-09 16:08:50'),
(16, '2026-06-09 11:01:00', '08BRE8', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK4UE', '2546', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:01:26', '2026-06-09 16:08:44'),
(17, '2026-06-09 11:01:00', '08BREM', '', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK5TX', '2547', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 09:01:35', '2026-06-09 16:08:37'),
(18, '2026-06-09 11:01:00', '08KNHB', '', '2026050600-1', 'COM', '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', 'Sn96.5Ag3Cu0.5/INDIUM8.9HF/TYPE4/88.5%', 'PMA5673', '', '0', 500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-11 00:00:00', '', '', '1', '3', '1', NULL, '2026-06-09 09:01:54', '2026-06-10 00:24:07'),
(19, '2026-06-09 11:01:00', '08KNHD', '', '2026050600-1', 'COM', '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', 'Sn96.5Ag3Cu0.5/INDIUM8.9HF/TYPE4/88.5%', 'PMA5673', '', '0', 500, 500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-03-11 00:00:00', '', '', '1', '3', '1', NULL, '2026-06-09 09:02:03', '2026-06-09 09:02:03'),
(20, '2026-06-09 11:02:00', '08KNHA', '', '2026050600-1', 'COM', '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', 'Sn96.5Ag3Cu0.5/INDIUM8.9HF/TYPE4/88.5%', 'PMA5673', '', '0', 500, 500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-03-11 00:00:00', '', '', '1', '3', '1', NULL, '2026-06-09 09:02:18', '2026-06-09 09:02:18'),
(21, '2026-06-09 11:02:00', '08B949', '', '2025121802-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6710612ZFK', '2546', '0', 2000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-09 09:02:37', '2026-06-10 00:39:20'),
(22, '2026-06-09 11:02:00', '08BV7U', '', '2025122300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00RQ4.07/1125474A07', '2547', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-21 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-09 09:03:02', '2026-06-10 00:39:15'),
(23, '2026-06-09 11:03:00', '08BV7Q', '', '2025122300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00RKP.03/1125471B06', '2547', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-21 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-09 09:03:17', '2026-06-11 04:28:47'),
(24, '2026-06-09 11:03:00', '08BV7R', '', '2025122300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00RKS.02/1125472A06', '2547', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-21 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-09 09:03:31', '2026-06-10 13:18:46'),
(25, '2026-06-09 11:03:00', '08BV7O', '', '2025122300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00S71.05/1125475C07', '2547', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-21 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-09 09:03:51', '2026-06-11 00:58:28'),
(26, '2026-06-09 11:04:00', '08BV7W', '', '2025122300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00RPR.02/1125474A06', '2547', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-21 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-09 09:04:58', '2026-06-10 05:32:20'),
(27, '2026-06-09 11:04:00', '08J9DI', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG0022P.03/1926061B06', '2606', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:05:23', '2026-06-10 00:39:25'),
(28, '2026-06-09 11:05:00', '08J9CT', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG002TM.03/1926071C06', '2607', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:06:02', '2026-06-09 09:06:02'),
(29, '2026-06-09 11:06:00', '08J9CS', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG002TF.03/1926074A06', '2607', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:06:23', '2026-06-09 09:06:23'),
(30, '2026-06-09 11:06:00', '08J9CW', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG001WE.03/1926063A07', '2606', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:06:37', '2026-06-09 09:06:37'),
(31, '2026-06-09 11:06:00', '08J9CV', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG002MF.08/1926071A07', '2607', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:06:51', '2026-06-09 09:06:51'),
(32, '2026-06-09 11:06:00', '08J9CX', '', '2026032600-1', 'IST', '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', 'VEMD2000X01', 'SG002MF.07/1926071A06', '2607', '0', 6000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-30 00:00:00', '', '', '2', '1', '3', NULL, '2026-06-09 09:07:04', '2026-06-10 13:18:29'),
(33, '2026-06-09 11:07:00', '08EAQ3', '', '2026012300-1', 'IST', '8041ISTC3R9B501', 'C-CAP 3.9pF 50V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R9BA01D', 'IA5N07UK1', '2603', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-16 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:07:30', '2026-06-10 00:38:52'),
(34, '2026-06-09 11:07:00', '08EAPZ', '', '2026012300-1', 'IST', '8041ISTC3R9B501', 'C-CAP 3.9pF 50V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R9BA01D', 'IA5N07UK1', '2603', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-16 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:07:45', '2026-06-10 05:31:51'),
(35, '2026-06-09 11:07:00', '08EAQ2', '', '2026012300-1', 'IST', '8041ISTC3R9B501', 'C-CAP 3.9pF 50V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R9BA01D', 'IA5N07UK1', '2603', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:07:57', '2026-06-09 09:07:57'),
(36, '2026-06-09 11:07:00', '08EAQ1', '', '2026012300-1', 'IST', '8041ISTC3R9B501', 'C-CAP 3.9pF 50V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R9BA01D', 'IA5N07UK1', '2603', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-16 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:08:08', '2026-06-10 13:13:15'),
(37, '2026-06-09 11:08:00', '05QFIP', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:08:26', '2026-06-11 03:08:57'),
(38, '2026-06-09 11:08:00', '05QFIN', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:08:45', '2026-06-09 09:08:45'),
(39, '2026-06-09 11:08:00', '05QFIM', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:09:04', '2026-06-09 09:09:04'),
(40, '2026-06-09 11:09:00', '05QFIK', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:09:21', '2026-06-09 09:09:21'),
(41, '2026-06-09 11:09:00', '05QFIJ', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:09:34', '2026-06-09 09:09:34'),
(42, '2026-06-09 11:09:00', '05QFJB', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 3995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:09:50', '2026-06-09 09:09:50'),
(43, '2026-06-09 11:09:00', '05QFIH', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:10:03', '2026-06-09 09:10:03'),
(44, '2026-06-09 11:10:00', '05QFII', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:10:15', '2026-06-09 09:10:15'),
(45, '2026-06-09 11:10:00', '05QFIO', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 3995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:10:28', '2026-06-09 09:10:28'),
(46, '2026-06-09 11:10:00', '05QFIL', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:10:41', '2026-06-09 09:10:41'),
(47, '2026-06-09 11:10:00', '05QFIG', '', '2022062200-1', 'IST', '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '', '240122', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:11:04', '2026-06-09 09:11:04'),
(48, '2026-06-09 11:11:00', '05OLD9', '', '2022060100-1', 'IST', '8091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', 'LQG15HS6N8J02', 'YF1N0302A', '131221', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:11:22', '2026-06-11 03:10:55'),
(49, '2026-06-09 11:11:00', '05OLD6', '', '2022060100-1', 'IST', '8091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', 'LQG15HS6N8J02', 'YF1N0302A', '131221', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:11:46', '2026-06-09 09:11:46'),
(50, '2026-06-09 11:11:00', '05OLDA', '', '2022060100-1', 'IST', '8091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', 'LQG15HS6N8J02', 'YF1N0302A', '131221', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:11:59', '2026-06-09 09:11:59'),
(51, '2026-06-09 11:11:00', '07EEQE', '', '2023053000-1', 'IST', '1091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', 'LQG15HS6N8J02', '2023053000', '070423', '0', 10000, 3333, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 2 L2 Box 1 Slot 4', '2', '2', '1', NULL, '2026-06-09 09:12:16', '2026-06-11 01:37:28'),
(52, '2026-06-09 11:12:00', '05NEN9', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190175', '2209', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:12:57', '2026-06-10 00:38:28'),
(53, '2026-06-10 12:30:00', '05NEOD', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190091', '2209', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Connected to feeder', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:13:15', '2026-06-10 10:31:08'),
(54, '2026-06-09 11:13:00', '05NEOA', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190090', '2209', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:13:27', '2026-06-09 09:13:27'),
(55, '2026-06-09 11:13:00', '05NELJ', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306200159', '2209', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:13:40', '2026-06-10 13:10:57'),
(56, '2026-06-10 07:41:00', '05NEOF', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190110', '2209', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:13:53', '2026-06-10 03:25:00'),
(57, '2026-06-09 11:13:00', '05NENN', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190111', '2209', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:14:11', '2026-06-11 03:10:03'),
(58, '2026-06-09 11:14:00', '05NEOC', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190092', '2209', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:14:25', '2026-06-09 09:14:25'),
(59, '2026-06-09 11:14:00', '05NEOG', '', '2022051600-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38L06306190071', '2209', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-03-04 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:14:39', '2026-06-09 09:14:39'),
(60, '2026-06-09 11:14:00', '07EHNL', '', '2023080400-1', 'IST', '1041ISTC6000333', 'CAP; SMD0402; 100pF; ±5%; 50V; C0G RoHS', 'GRM1555C1H101JA01', '2023080400', '20230630', '0', 10000, 3113, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 2 L2 Box 1 Slot 6', '2', '2', '1', NULL, '2026-06-09 09:14:55', '2026-06-11 01:37:28'),
(61, '2026-06-09 11:14:00', '07EHMI', '', '2023062900-1', 'IST', '1041ISTC6000333', 'CAP; SMD0402; 100pF; ±5%; 50V; C0G RoHS', 'GRM1555C1H101JA01', '2023062900', '2302', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-17 00:00:00', '', 'Rack 2 L2 Box 1 Slot 6', '2', '2', '1', NULL, '2026-06-09 09:15:10', '2026-06-11 03:09:32'),
(62, '2026-06-09 11:15:00', '08M90V', '', '2026052800-1', 'IST', '1131ISTT2002015', 'TRANSISTOR BJT NEXPERIA BC847CW RoHS', 'BC847CW', 'TBPE44141A0A', '2545', '0', 3000, 2082, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-07 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:15:20', '2026-06-09 09:15:20'),
(63, '2026-06-09 11:15:00', '08M915', '', '2026052800-1', 'IST', '1131ISTT2002015', 'TRANSISTOR BJT NEXPERIA BC847CW RoHS', 'BC847CW', 'TBPE4414180A', '2545', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-07 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:15:30', '2026-06-09 09:15:30'),
(64, '2026-06-09 11:15:00', '06RDUC', '', '2023101700-1', 'IST', '1131ISTT4000085', 'TRAN SMD  BC847CW RoHS', 'BC847CW', 'TBPC1906360A', '2320', '0', 3000, 235, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-20 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:15:48', '2026-06-09 09:15:48'),
(65, '2026-06-09 11:15:00', '0898HA', '', '2025111300-1', 'IST', '1131ISTT4000085', 'TRAN SMD  BC847CW RoHS', 'BC847CW', 'TBPE3000610A', '2531', '0', 3000, 2365, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-01 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:16:04', '2026-06-09 09:16:04'),
(66, '2026-06-09 11:16:00', '06RDUE', '', '2023101700-1', 'IST', '1131ISTT4000085', 'TRAN SMD  BC847CW RoHS', 'BC847CW', 'TBPC1906360A', '2320', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-20 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:16:35', '2026-06-09 09:16:35'),
(67, '2026-06-09 11:16:00', '06RDUD', '', '2023101700-1', 'IST', '1131ISTT4000085', 'TRAN SMD  BC847CW RoHS', 'BC847CW', 'TBPC1906360A', '2320', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-20 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-09 09:16:59', '2026-06-09 09:16:59'),
(68, '2026-06-09 16:17:00', '08D5NP', '', '2025122100-1', 'IST', '1051ISTC223F200', 'C-RES 22kOhm +/-1% 1/16W 50PPM 0603 RoHS', 'RGC1/16C223FTP', '50226538', '20250916', '0', 5000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-10-07 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:17:47', '2026-06-11 03:11:58'),
(69, '2026-06-09 16:17:00', '08D5N8', '', '2025122100-1', 'IST', '1051ISTC223F200', 'C-RES 22kOhm +/-1% 1/16W 50PPM 0603 RoHS', 'RGC1/16C223FTP', '77015538', '20250915', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-07 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:18:00', '2026-06-09 09:18:00'),
(70, '2026-06-09 16:18:00', '08A6OB', '', '2025112200-1', 'IST', '1051ISTC393F200', 'C-RES 39kOhm +/-1% 1/16W 50PPM 0603 RoHS', 'RGC1/16C393FTP', '60587538', '20250919', '0', 5000, 3296, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-19 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:18:12', '2026-06-09 09:18:12'),
(71, '2026-06-09 16:18:00', '08A6OA', '', '2025112200-1', 'IST', '1051ISTC393F200', 'C-RES 39kOhm +/-1% 1/16W 50PPM 0603 RoHS', 'RGC1/16C393FTP', '60587538', '20250919', '0', 5000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-09-19 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:18:26', '2026-06-11 03:12:42'),
(72, '2026-06-09 16:18:00', '08DNRH', '', '2026011400-1', 'IST', '1051ISTC563F100', 'C-RES 56 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0756KL', '38O45510690054', '2550', '0', 10000, 3761, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:18:41', '2026-06-09 09:18:41'),
(73, '2026-06-09 16:18:00', '08DNS8', '', '2026011400-1', 'IST', '1051ISTC563F100', 'C-RES 56 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0756KL', '38O45510690077', '2550', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:18:57', '2026-06-10 05:31:23'),
(74, '2026-06-09 16:18:00', '08E1OQ', '', '2026012100-1', 'IST', '1051ISTC2M2F100', 'C-RES 2.2 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-072M2L', '38O47711930136', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-31 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:19:39', '2026-06-10 00:37:48'),
(75, '2026-06-09 16:19:00', '088TD4', '', '2025110500-1', 'IST', '1051ISTC471F001', 'C-RES 470 Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07470RL', '38O3051133', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:19:56', '2026-06-09 09:19:56'),
(76, '2026-06-09 16:21:00', '08LENO', '', '2026042900-1', 'IST', '1051ISTC472F001', 'C-RES 4.7 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-074K7L', '38N2770800', '2434', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-08-23 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:21:25', '2026-06-09 09:21:25'),
(77, '2026-06-09 16:21:00', '08LENJ', '', '2026042900-1', 'IST', '1051ISTC472F001', 'C-RES 4.7 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-074K7L', '38N2770800', '2434', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-08-23 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:21:42', '2026-06-09 09:21:42'),
(78, '2026-06-09 16:21:00', '08DVUP', '', '2026012700-1', 'IST', '1051ISTC473F001', 'C-RES 47 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0747KL', '38O41208280127', '2546', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:21:53', '2026-06-11 00:55:00'),
(79, '2026-06-09 16:21:00', '08BRIA', '', '2025121700-1', 'IST', '1051ISTC000J200', 'C-RES 0 Ohm +/-5% 1/10W 0603 RoHS', 'RC0603JR-070RL', '38O23301990015', '2535', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:22:02', '2026-06-09 09:22:02'),
(80, '2026-06-09 16:22:00', '08DQ0P', '', '2026012700-1', 'IST', '1051ISTC4000091', 'C-RES 910R +/-1% 2W 100PPM 2512 RoHS', 'RC2512FK-7W910RL', '38O50507360003', '2551', '0', 4000, 1197, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-19 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:22:13', '2026-06-09 09:22:13'),
(81, '2026-06-09 16:22:00', '08DQ0O', '', '2026012700-1', 'IST', '1051ISTC4000091', 'C-RES 910R +/-1% 2W 100PPM 2512 RoHS', 'RC2512FK-7W910RL', '38O50507360002', '2551', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-19 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:22:30', '2026-06-09 09:22:30'),
(82, '2026-06-09 16:22:00', '08EXJ9', '', '2026020400-1', 'IST', '1051ISTC4000026', 'C-RES 4.7Ohm +/-1%  1/16W 0402 RoHS', 'RC0402FR-074R7L', '38O4120873', '2553', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 09:22:46', '2026-06-09 09:22:46'),
(83, '2026-06-09 16:22:00', '06OCU4', '', '2023082600-1', 'IST', '1081ISTC6000195', 'Crystal; 3215; 32768Hz, ±20ppm, CL=7pF', 'FC-135 32.7680KA-AG*', '2023082600', '040823', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-17 00:00:00', '', 'Rack 2 L2 Box 3 Slot 1', '2', '2', '3', NULL, '2026-06-09 09:23:31', '2026-06-11 01:37:28'),
(84, '2026-06-09 16:23:00', '06OCU5', '', '2023082600-1', 'IST', '1081ISTC6000195', 'Crystal; 3215; 32768Hz, ±20ppm, CL=7pF', 'FC-135 32.7680KA-AG*', '2023082600', '040823', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-17 00:00:00', '', 'Rack 2 L2 Box 3 Slot 1', '2', '2', '3', NULL, '2026-06-09 09:23:46', '2026-06-11 03:07:04'),
(85, '2026-06-09 16:23:00', '06H8XO', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:24:07', '2026-06-09 09:24:07'),
(86, '2026-06-09 16:24:00', '06H8Y0', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:24:20', '2026-06-09 09:24:20'),
(87, '2026-06-09 16:24:00', '06H8XX', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:24:33', '2026-06-09 09:24:33'),
(88, '2026-06-09 16:24:00', '06H8XY', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:24:51', '2026-06-09 09:24:51'),
(89, '2026-06-09 16:24:00', '06H8XV', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:25:38', '2026-06-09 09:25:38'),
(90, '2026-06-09 16:25:00', '06H8XW', '', '2023051800-1', 'IST', '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', 'T24000E0F001', '', '060423', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:25:54', '2026-06-11 03:07:14'),
(91, '2026-06-09 16:25:00', '06KU29', '', '2023070800-1', 'IST', '1091ISTI6000199', 'IND; SMD0603; 10µH; ±20%; 300mA; 0.6?', 'MLZ1608N100LT000', 'U022H00191+S073536325', '2233', '0', 4000, 3995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:26:09', '2026-06-09 09:26:09'),
(92, '2026-06-09 16:26:00', '06KU26', '', '2023070800-1', 'IST', '1091ISTI6000199', 'IND; SMD0603; 10µH; ±20%; 300mA; 0.6?', 'MLZ1608N100LT000', 'U022H00191+S073536318', '2233', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:26:22', '2026-06-11 03:07:29'),
(93, '2026-06-09 16:27:00', '07EE8G', '', '2023071800-1', 'IST', '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF341003B', '20230623', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:28:25', '2026-06-11 03:07:20'),
(94, '2026-06-09 16:28:00', '07EE8I', '', '2023071800-1', 'IST', '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF341003B', '20230623', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:28:39', '2026-06-09 09:28:39'),
(95, '2026-06-09 16:28:00', '07EE5P', '', '2023071800-1', 'IST', '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF3405031', '20230623', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:28:54', '2026-06-09 09:28:54'),
(96, '2026-06-09 16:28:00', '07EE8H', '', '2023071800-1', 'IST', '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF341003B', '20230623', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:29:07', '2026-06-09 09:29:07'),
(97, '2026-06-09 16:29:00', '07EE8N', '', '2023071800-1', 'IST', '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF341003B', '20230623', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:29:24', '2026-06-09 09:29:24'),
(98, '2026-06-09 16:30:00', '07ED0Y', '', '2023080100-1', 'IST', '1091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', 'LQG15HS27NJ02', 'YF3127025', '20230602', '0', 10000, 5384, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:30:55', '2026-06-09 09:30:55'),
(99, '2026-06-09 16:30:00', '07ED0G', '', '2023080100-1', 'IST', '1091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', 'LQG15HS27NJ02', 'YF3127025', '20230602', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:31:13', '2026-06-11 03:10:34'),
(100, '2026-06-09 16:31:00', '07ECZP', '', '2023080100-1', 'IST', '1091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', 'LQG15HS27NJ02', 'YF3127025', '20230602', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:31:30', '2026-06-09 09:31:30'),
(101, '2026-06-09 16:31:00', '07ECZS', '', '2023080100-1', 'IST', '1091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', 'LQG15HS27NJ02', 'YF3127025', '20230602', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '2', '3', NULL, '2026-06-09 09:31:45', '2026-06-09 09:31:45'),
(102, '2026-06-09 16:31:00', '08E0IN', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-2SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:02', '2026-06-09 09:32:02'),
(103, '2026-06-09 16:32:00', '08E0IM', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-2SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:10', '2026-06-09 09:32:10'),
(104, '2026-06-09 16:32:00', '08E0NS', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:19', '2026-06-09 09:32:19'),
(105, '2026-06-09 16:32:00', '08E0NO', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:28', '2026-06-09 09:32:28'),
(106, '2026-06-09 16:32:00', '08E0O6', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:38', '2026-06-09 09:32:38'),
(107, '2026-06-09 16:32:00', '08E0OA', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:46', '2026-06-09 09:32:46'),
(108, '2026-06-09 16:32:00', '08E0OB', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:32:56', '2026-06-09 09:32:56'),
(109, '2026-06-09 16:32:00', '08E0O8', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:33:16', '2026-06-09 09:33:16'),
(110, '2026-06-09 16:33:00', '08E0NT', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:33:27', '2026-06-09 09:33:27'),
(111, '2026-06-09 16:33:00', '08E0NV', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:33:35', '2026-06-09 09:33:35'),
(112, '2026-06-09 16:33:00', '08E0IJ', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-2SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:33:45', '2026-06-09 09:33:45'),
(113, '2026-06-09 16:33:00', '08E0O3', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:33:54', '2026-06-09 09:33:54'),
(114, '2026-06-09 16:33:00', '08E0O4', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:11', '2026-06-09 09:34:11'),
(115, '2026-06-09 16:34:00', '08E0O5', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:20', '2026-06-09 09:34:20'),
(116, '2026-06-09 16:34:00', '08E0O9', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:28', '2026-06-09 09:34:28'),
(117, '2026-06-09 16:34:00', '08E0NN', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:35', '2026-06-09 09:34:35'),
(118, '2026-06-09 16:34:00', '08E0NR', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:43', '2026-06-09 09:34:43'),
(119, '2026-06-09 16:34:00', '08E0NW', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:34:52', '2026-06-09 09:34:52'),
(120, '2026-06-09 16:34:00', '08E0NQ', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:35:03', '2026-06-09 09:35:03'),
(121, '2026-06-09 16:35:00', '08E0O2', '', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0348-1SNDMF', '251010', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 09:35:15', '2026-06-09 09:35:15'),
(122, '2026-06-09 16:35:00', '08D5VJ', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24UR7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:05', '2026-06-09 09:36:05'),
(123, '2026-06-09 16:36:00', '08D5TD', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US3', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:18', '2026-06-09 09:36:18'),
(124, '2026-06-09 16:36:00', '08D5TG', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US3', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:27', '2026-06-09 09:36:27'),
(125, '2026-06-09 16:36:00', '08D5TH', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US3', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:35', '2026-06-09 09:36:35'),
(126, '2026-06-09 16:36:00', '08D5TE', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US0', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:44', '2026-06-09 09:36:44'),
(127, '2026-06-09 16:36:00', '08D5TF', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US0', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:36:52', '2026-06-09 09:36:52'),
(128, '2026-06-09 16:36:00', '08D5TA', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US3', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:37:18', '2026-06-09 09:37:18'),
(129, '2026-06-09 16:37:00', '08D5RZ', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US6', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:37:31', '2026-06-09 09:37:31'),
(130, '2026-06-09 16:37:00', '08D5RW', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US6', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:37:39', '2026-06-10 13:05:14'),
(131, '2026-06-09 16:37:00', '08D5RX', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US6', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:37:50', '2026-06-09 09:37:50'),
(132, '2026-06-09 16:37:00', '08D5VI', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24UR7', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:37:59', '2026-06-10 00:36:17'),
(133, '2026-06-09 16:37:00', '08D5VN', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24UR7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:38:08', '2026-06-09 09:38:08'),
(134, '2026-06-09 16:38:00', '08D5RY', '', '2026010900-1', 'IST', '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H200JA01D', 'IA5O24US6', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:38:19', '2026-06-11 00:55:25'),
(135, '2026-06-09 16:38:00', '08CR7X', '', '2025122600-1', 'IST', '8041ISTC3R3B501', 'C-CAP 3.3pF 16V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R3BA01D', 'IA5D04UM6', '2551', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-19 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:38:37', '2026-06-11 00:52:51'),
(136, '2026-06-09 16:38:00', '08CR7Y', '', '2025122600-1', 'IST', '8041ISTC3R3B501', 'C-CAP 3.3pF 16V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R3BA01D', 'IA5D04UM6', '2551', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-19 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:38:46', '2026-06-10 05:30:53'),
(137, '2026-06-09 16:38:00', '08CR7Z', '', '2025122600-1', 'IST', '8041ISTC3R3B501', 'C-CAP 3.3pF 16V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R3BA01D', 'IA5D04UM6', '2551', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-19 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:38:55', '2026-06-09 09:38:55'),
(138, '2026-06-09 16:38:00', '08ARDF', '', '2025120500-1', 'IST', '8041ISTC3R3B501', 'C-CAP 3.3pF 16V +/-0.1pF COG 0402 RoHS', 'GRM1555C1H3R3BA01D', 'IA5N14UW0', '2548', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:39:05', '2026-06-10 00:38:47'),
(139, '2026-06-10 07:41:00', '08D5J6', '', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5D01A04', '2552', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:39:34', '2026-06-10 03:25:01'),
(140, '2026-06-09 16:39:00', '088B5U', '', '2025103100-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5911A27', '2543', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-10-24 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:39:44', '2026-06-10 00:45:20'),
(141, '2026-06-09 16:39:00', '08D5J4', '', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5D01A04', '2552', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:39:53', '2026-06-11 00:55:09'),
(142, '2026-06-09 16:39:00', '08D5J9', '', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5D01A04', '2552', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-09 09:40:04', '2026-06-10 13:04:44'),
(143, '2026-06-09 16:40:00', '05OMXV', '', '2022060100-1', 'IST', '8041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R6CA01', 'WG17230JG', '20210729', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:40:53', '2026-06-11 03:04:24'),
(144, '2026-06-09 16:40:00', '05OMXY', '', '2022060100-1', 'IST', '8041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R6CA01', 'WG17230JG', '20210729', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:41:08', '2026-06-09 09:41:08'),
(145, '2026-06-09 16:41:00', '05OMY3', '', '2022060100-1', 'IST', '8041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R6CA01', 'WG17230JG', '20210729', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:41:23', '2026-06-09 09:41:23'),
(146, '2026-06-09 16:41:00', '05OMXZ', '', '2022060100-1', 'IST', '8041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R6CA01', 'WG17230JG', '20210729', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:41:35', '2026-06-09 09:41:35'),
(147, '2026-06-09 16:41:00', '05OLPP', '', '2022060100-1', 'IST', '8041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', 'GRM1555C1H2R7CA01', 'WG15280CC', '230621', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:41:50', '2026-06-11 03:04:37'),
(148, '2026-06-09 16:41:00', '05OLQC', '', '2022060100-1', 'IST', '8041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', 'GRM1555C1H2R7CA01', 'WG140810G', '280421', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:42:03', '2026-06-09 09:42:03');
INSERT INTO `inventory_receive` (`id`, `ReceiveDate`, `PUID`, `ReservationNo`, `IM`, `Customer`, `HanaPart`, `Description`, `MnfPartNo`, `LotNo`, `DateCode`, `BinSize`, `Qty`, `QtyRemain`, `McID`, `MachineName`, `StatusName`, `ExpirationDate`, `OldIM`, `Remark`, `Loc_Shelf`, `Loc_Level`, `Loc_Box`, `ExpireDate_RoomTemp`, `created_at`, `updated_at`) VALUES
(149, '2026-06-09 16:42:00', '05OLQ5', '', '2022060100-1', 'IST', '8041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', 'GRM1555C1H2R7CA01', 'WG140810G', '280421', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:42:17', '2026-06-09 09:42:17'),
(150, '2026-06-09 16:42:00', '05LZTB', '', '2022042800-1', 'IST', '8041ISTC6000190', 'CAP; SMD0402; 3pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R0CA01', 'WG16010CT', '230621', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:42:36', '2026-06-11 03:03:55'),
(151, '2026-06-09 16:42:00', '05LZTE', '', '2022042800-1', 'IST', '8041ISTC6000190', 'CAP; SMD0402; 3pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R0CA01', 'WG16010CT', '230621', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:42:49', '2026-06-09 09:42:49'),
(152, '2026-06-09 16:42:00', '05LZTD', '', '2022042800-1', 'IST', '8041ISTC6000190', 'CAP; SMD0402; 3pF; ±0.25pF; 50V; COG', 'GRM1555C1H3R0CA01', 'WG16010CT', '230621', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:43:29', '2026-06-09 09:43:29'),
(153, '2026-06-09 16:43:00', '05ONG2', '', '2022060100-1', 'IST', '8041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01', '', '20211011', '0', 10000, 9720, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-20 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:43:39', '2026-06-09 09:43:39'),
(154, '2026-06-09 16:43:00', '05QF9Q', '', '2022062200-1', 'IST', '8041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', 'WG2207J5N', '140222', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:44:01', '2026-06-11 03:08:18'),
(155, '2026-06-09 16:44:00', '05QF9U', '', '2022062200-1', 'IST', '8041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', 'WG2207J5N', '140222', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:44:13', '2026-06-09 09:44:13'),
(156, '2026-06-09 16:44:00', '05QF9T', '', '2022062200-1', 'IST', '8041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', 'WG2207J5N', '140222', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:44:25', '2026-06-09 09:44:25'),
(157, '2026-06-09 16:44:00', '05QF9Z', '', '2022062200-1', 'IST', '8041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', 'WG2207J5N', '140222', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:44:40', '2026-06-09 09:44:40'),
(158, '2026-06-09 16:44:00', '08KHC3', '', '2026042900-1', 'IST', '1051ISTR2002009', 'RES; SMD0402; 220 Ohm; ±1%; 1/16W;100ppm', 'RC0402FR-07220RL', '50N31771380073', '2433', '0', 10000, 7786, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-08-16 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:44:49', '2026-06-09 09:44:49'),
(159, '2026-06-09 16:44:00', '08GNTF', '', '2026030900-1', 'IST', '1051ISTR2002010', 'RES; SMD0402; 150Kom; ±1%; 1/16W; 100ppm', 'RC0402FR-07150KL', '38O4311193', '2604', '0', 10000, 6125, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-08 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:01', '2026-06-09 09:45:01'),
(160, '2026-06-09 16:45:00', '08GNTG', '', '2026030900-1', 'IST', '1051ISTR2002010', 'RES; SMD0402; 150Kom; ±1%; 1/16W; 100ppm', 'RC0402FR-07150KL', '38O4311193', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-08 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:16', '2026-06-09 09:45:16'),
(161, '2026-06-09 16:45:00', '08HJJ0', '', '2026031101-1', 'IST', '1061ISTD2002012', 'DIODE NEXPERIA BAT54SW RoHS', 'BAT54SW', 'TBPE3311230A', '2535', '0', 3000, 444, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:24', '2026-06-09 09:45:24'),
(162, '2026-06-09 16:45:00', '08HJIV', '', '2026031101-1', 'IST', '1061ISTD2002012', 'DIODE NEXPERIA BAT54SW RoHS', 'BAT54SW', 'TBPE3311220A', '2535', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:33', '2026-06-09 09:45:33'),
(163, '2026-06-09 16:45:00', '08HJIX', '', '2026031101-1', 'IST', '1061ISTD2002012', 'DIODE NEXPERIA BAT54SW RoHS', 'BAT54SW', 'TBPE3310341A', '2535', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:42', '2026-06-09 09:45:42'),
(164, '2026-06-09 16:45:00', '08M90A', '', '2026052800-1', 'IST', '1131ISTT2002014', 'TRANSISTOR BJT NEXPERIA BC857CW RoHS', 'BC857CW', 'TBPE5107470A', '2552', '0', 3000, 2267, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:45:55', '2026-06-09 09:45:55'),
(165, '2026-06-09 16:45:00', '060TD6', '', '2022102400-1', 'IST', '8091ISTI6000347', 'IND; SMD0402; 12nH; ±5%', 'LQG15HS12NJ02D', '', '210218', '0', 10000, 544, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:46:28', '2026-06-09 09:46:28'),
(166, '2026-06-09 16:46:00', '060TD8', '', '2022102400-1', 'IST', '8091ISTI6000347', 'IND; SMD0402; 12nH; ±5%', 'LQG15HS12NJ02D', '', '210218', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '2', '3', '3', NULL, '2026-06-09 09:46:40', '2026-06-09 09:46:40'),
(167, '2026-06-09 16:46:00', '08KDMI', '', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-09 09:47:05', '2026-06-10 00:39:04'),
(168, '2026-06-09 16:47:00', '08DHJ3', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:47:22', '2026-06-09 09:47:22'),
(169, '2026-06-09 16:47:00', '08DHIU', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:47:45', '2026-06-09 09:47:45'),
(170, '2026-06-09 16:47:00', '08DHIR', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:47:53', '2026-06-09 09:47:53'),
(171, '2026-06-09 16:47:00', '08DHJ5', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:48:02', '2026-06-09 09:48:02'),
(172, '2026-06-09 16:48:00', '08DHJH', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:48:11', '2026-06-09 09:48:11'),
(173, '2026-06-09 16:48:00', '08DHJC', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 1000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:48:22', '2026-06-09 09:48:22'),
(174, '2026-06-09 16:48:00', '08DHJB', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:48:35', '2026-06-09 12:28:11'),
(175, '2026-06-09 16:48:00', '08DHJA', '', '2026011300-1', 'IST', '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', 'BSP149 H6327', 'PF545455C06', '2550', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-12 00:00:00', '', '', '2', '4', '2', NULL, '2026-06-09 09:48:49', '2026-06-09 12:28:08'),
(176, '2026-06-09 16:48:00', '08KAY5', '', '2026011500-1', 'IST', '1061ISTD2000449', 'ESD protection diode', 'ESD5Z7.0T1G', 'MQT295929', '2530', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-04-18 00:00:00', '', '', '2', '4', '3', NULL, '2026-06-09 09:49:01', '2026-06-09 12:27:52'),
(177, '2026-06-09 16:49:00', '08KAYA', '', '2026011500-1', 'IST', '1061ISTD2000449', 'ESD protection diode', 'ESD5Z7.0T1G', 'MQT295929', '2530', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-04-18 00:00:00', '', '', '2', '4', '3', NULL, '2026-06-09 09:49:10', '2026-06-09 12:27:49'),
(178, '2026-06-09 16:49:00', '08E1ZN', '', '2026012100-1', 'IST', '1051ISTC4000022', 'C-RES 51Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0751RL', '38O23709620071', '2525', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-06-20 00:00:00', '', '', '2', '4', '4', NULL, '2026-06-09 09:49:26', '2026-06-09 09:49:26'),
(179, '2026-06-09 16:49:00', '08E1YX', '', '2026012100-1', 'IST', '1051ISTC4000022', 'C-RES 51Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0751RL', '38O23709620053', '2525', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-06-20 00:00:00', '', '', '2', '4', '4', NULL, '2026-06-09 09:49:34', '2026-06-09 09:49:34'),
(180, '2026-06-09 16:49:00', '05M8SP', '', '2022042800-1', 'IST', '8091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', 'LQG15HS27NJ02', 'YF1N1601F', '20220118', '0', 10000, 9990, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-04-01 00:00:00', '', '', '2', '4', '5', NULL, '2026-06-09 09:49:46', '2026-06-09 09:49:46'),
(181, '2026-06-09 16:49:00', '08EEVX', '', '2026020400-1', 'IST', '1161ISTF2000425', 'Fuses - PPTC 0.05A 30V 1210 RoHS', '1210L005WR', 'COH1Q1', '11/28/25', '0', 3000, 713, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '2', '4', '5', NULL, '2026-06-09 09:50:01', '2026-06-09 09:50:01'),
(182, '2026-06-09 16:50:00', '08EEVZ', '', '2026020400-1', 'IST', '1161ISTF2000425', 'Fuses - PPTC 0.05A 30V 1210 RoHS', '1210L005WR', 'COH1Q1', '11/28/25', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '2', '4', '5', NULL, '2026-06-09 09:50:11', '2026-06-09 09:50:11'),
(183, '2026-06-09 16:50:00', '08EEW0', '', '2026020400-1', 'IST', '1161ISTF2000425', 'Fuses - PPTC 0.05A 30V 1210 RoHS', '1210L005WR', 'COH1Q1', '11/28/25', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '2', '4', '5', NULL, '2026-06-09 09:50:19', '2026-06-09 09:50:19'),
(184, '2026-06-09 16:50:00', '08K37X', '', '2026042900-1', 'IST', '1051ISTR2002008', 'RES; SMD0402; 300Kohm; ±1%; 1/16W;100ppm', 'RC0402FR-07300KL', '38O4910864', '2612', '0', 10000, 7645, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-19 00:00:00', '', '', '2', '4', '5', NULL, '2026-06-09 09:50:31', '2026-06-09 09:50:31'),
(185, '2026-06-09 16:50:00', '08I3Z7', '', '2026032700-1', 'IST', '1031ISTC2002016', 'CON,SMT,8pin(2 row*4 pin) -.100\"(2.54mm)', 'HLE-104-02-F-DV-A-K*', 'THPO-260110041', '2605', '0', 725, 353, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-30 00:00:00', '', '', '3', '1', '1', NULL, '2026-06-09 09:50:56', '2026-06-09 09:50:56'),
(186, '2026-06-09 16:50:00', '08H8TP', '', '2026021800-1', 'IST', '1161ISTS2000322', 'SWITCH 999-52722-4.8x4.5x0.55-Ag-TR', 'TP-1198-L00316', '', '190126', '0', 5000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-19 00:00:00', '', '', '3', '1', '2', NULL, '2026-06-09 09:51:07', '2026-06-10 00:39:09'),
(187, '2026-06-09 16:51:00', '05VVL2', '', '2022082500-1', 'IST', '8021ISTI2000469', 'IC VQFN48, TI CC1310F128RGZR', 'CC1310F128RGZR', '2669922CL2', '2229', '0', 2500, 2500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '1', '4', NULL, '2026-06-09 09:51:27', '2026-06-09 09:51:27'),
(188, '2026-06-09 16:51:00', '05VVLP', '', '2022082500-1', 'IST', '8021ISTI2000469', 'IC VQFN48, TI CC1310F128RGZR', 'CC1310F128RGZR', '2266122CD2', '2229', '0', 2500, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '3', '1', '4', NULL, '2026-06-09 09:51:40', '2026-06-11 03:13:59'),
(189, '2026-06-09 16:51:00', '05VVL1', '', '2022082500-1', 'IST', '8021ISTI2000469', 'IC VQFN48, TI CC1310F128RGZR', 'CC1310F128RGZR', '2593552CL2', '2229', '0', 2500, 2500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '1', '4', NULL, '2026-06-09 09:51:52', '2026-06-09 09:51:52'),
(190, '2026-06-09 16:51:00', '05VVLV', '', '2022082500-1', 'IST', '8021ISTI2000469', 'IC VQFN48, TI CC1310F128RGZR', 'CC1310F128RGZR', '2612312CL2', '2229', '0', 2500, 2500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '1', '4', NULL, '2026-06-09 09:52:03', '2026-06-09 09:52:03'),
(191, '2026-06-09 16:53:00', '08FORP', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:53:20', '2026-06-10 05:31:52'),
(192, '2026-06-09 16:53:00', '08FOQP', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:53:32', '2026-06-10 13:09:27'),
(193, '2026-06-09 16:53:00', '08FOQM', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:53:42', '2026-06-10 13:09:19'),
(194, '2026-06-09 16:53:00', '08FOQN', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:53:54', '2026-06-10 13:08:59'),
(195, '2026-06-09 16:53:00', '08FORR', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:54:06', '2026-06-11 00:56:47'),
(196, '2026-06-09 16:54:00', '08FORO', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:54:18', '2026-06-11 00:56:40'),
(197, '2026-06-09 16:54:00', '08FORM', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:54:30', '2026-06-11 00:56:54'),
(198, '2026-06-09 16:54:00', '08FOQK', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:54:51', '2026-06-09 09:54:51'),
(199, '2026-06-11 03:45:00', '08FOQL', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:55:03', '2026-06-11 02:58:46'),
(200, '2026-06-09 16:55:00', '08FOQI', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:55:13', '2026-06-11 00:57:02'),
(201, '2026-06-09 16:55:00', '08FOQJ', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:55:27', '2026-06-10 21:17:19'),
(202, '2026-06-09 16:55:00', '08FOQG', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:55:38', '2026-06-10 00:38:49'),
(203, '2026-06-09 16:55:00', '08FOQH', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:55:51', '2026-06-09 09:55:51'),
(204, '2026-06-09 16:55:00', '08FOQO', '', '2026021300-1', 'IST', '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', 'GRM155R71C104KA88*', 'IA6116EH5', '2606', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-13 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:56:04', '2026-06-09 09:56:04'),
(205, '2026-06-09 16:56:00', '08MCMC', '', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:56:12', '2026-06-10 00:38:15'),
(206, '2026-06-09 16:56:00', '08MB3J', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:56:32', '2026-06-10 13:04:14'),
(207, '2026-06-10 07:41:00', '08MB9J', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0360993', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:56:43', '2026-06-10 03:24:57'),
(208, '2026-06-09 16:56:00', '08MB3K', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:56:54', '2026-06-11 03:11:10'),
(209, '2026-06-09 16:56:00', '08MB9E', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0360993', '2614', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:04', '2026-06-09 09:57:04'),
(210, '2026-06-09 16:57:00', '08MB35', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:13', '2026-06-10 05:30:50'),
(211, '2026-06-09 16:57:00', '08MB37', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:22', '2026-06-11 00:53:16'),
(212, '2026-06-09 16:57:00', '08MB3R', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:30', '2026-06-09 09:57:30'),
(213, '2026-06-09 16:57:00', '08MB3O', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:39', '2026-06-10 21:17:18'),
(214, '2026-06-09 16:57:00', '08MB3P', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:47', '2026-06-10 13:04:31'),
(215, '2026-06-09 16:57:00', '08MB3I', '', '2026050600-1', 'IST', '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-070RL', '38P0370208', '2614', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 09:57:55', '2026-06-11 00:53:08'),
(216, '2026-06-09 16:57:00', '08J9A8', '', '2026041800-1', 'IST', '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-07330RL', '38P1110247', '2613', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:58:30', '2026-06-10 00:38:13'),
(217, '2026-06-09 16:58:00', '08J9AP', '', '2026041800-1', 'IST', '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-07330RL', '38P1110247', '2613', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:58:40', '2026-06-09 09:58:40'),
(218, '2026-06-09 16:58:00', '08J9A7', '', '2026041800-1', 'IST', '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-07330RL', '38P1110247', '2613', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:58:51', '2026-06-09 09:58:51'),
(219, '2026-06-09 16:58:00', '08B88T', '', '2025121100-1', 'IST', '1051ISTC335F001', 'C-RES 3.3 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-073M3L', '38O13401250019', '2515', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-11 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:59:09', '2026-06-09 09:59:09'),
(220, '2026-06-09 16:59:00', '08B88F', '', '2025121100-1', 'IST', '1051ISTC335F001', 'C-RES 3.3 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-073M3L', '38O13401250006', '2515', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-11 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:59:19', '2026-06-09 09:59:19'),
(221, '2026-06-09 16:59:00', '08B88H', '', '2025121100-1', 'IST', '1051ISTC335F001', 'C-RES 3.3 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-073M3L', '38O13401250024', '2515', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-11 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:59:35', '2026-06-09 09:59:35'),
(222, '2026-06-09 16:59:00', '08B88P', '', '2025121100-1', 'IST', '1051ISTC335F001', 'C-RES 3.3 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-073M3L', '38O13401250002', '2515', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-11 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:59:44', '2026-06-09 09:59:44'),
(223, '2026-06-09 16:59:00', '06Q1LX', '', '2023092000-1', 'IST', '1051ISTC4000083', 'C-RES 267Ohm+/-0.1% 1/10W 10PPM 0603RoHS', 'RT0603BRB07267RL', '38M27260640007', '2327', '0', 5000, 281, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-20 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 09:59:58', '2026-06-09 09:59:58'),
(224, '2026-06-09 16:59:00', '088HI4', '', '2025110400-1', 'IST', '1051ISTC4000083', 'C-RES 267Ohm+/-0.1% 1/10W 10PPM 0603RoHS', 'RT0603BRB07267RL', '18O37700220002', '2540', '0', 5000, 1387, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-03 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:00:07', '2026-06-09 10:00:07'),
(225, '2026-06-09 17:00:00', '084XXJ', '', '2025092300-1', 'IST', '1051ISTC4000083', 'C-RES 267Ohm+/-0.1% 1/10W 10PPM 0603RoHS', 'RT0603BRB07267RL', '18O24600660001', '2535', '0', 5000, 3902, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:00:18', '2026-06-09 10:00:18'),
(226, '2026-06-09 17:00:00', '08HJU7', '', '2026031700-1', 'IST', '1051ISTC4000083', 'C-RES 267Ohm+/-0.1% 1/10W 10PPM 0603RoHS', 'RT0603BRB07267RL', '18P0520251', '2608', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2029-03-16 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:00:32', '2026-06-09 10:00:32'),
(227, '2026-06-09 17:00:00', '08F06H', '', '2026021200-1', 'IST', '1051ISTC332F001', 'C-RES 3.3 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-073K3L', '38O38411080110', '2543', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:00:48', '2026-06-09 10:00:48'),
(228, '2026-06-09 17:00:00', '08CD88', '', '2025122400-1', 'IST', '1051ISTC4000082', 'C-RES 1MOhm  +/-1% 1/16W 0402 RoHS', 'RC0402FR-071ML', '38O39111300159', '2542', '0', 10000, 5657, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-17 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:00:57', '2026-06-09 10:00:57'),
(229, '2026-06-09 17:00:00', '08AZJ8', '', '2025121000-1', 'IST', '1051ISTC4000020', 'C-RES 1Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-071RL', '38O3950005', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-31 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:08', '2026-06-09 10:01:08'),
(230, '2026-06-09 17:01:00', '08AZJ9', '', '2025121000-1', 'IST', '1051ISTC4000020', 'C-RES 1Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-071RL', '38O3950005', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-31 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:16', '2026-06-09 10:01:16'),
(231, '2026-06-09 17:01:00', '08CQPE', '', '2026011400-1', 'IST', '1051ISTC4000021', 'C-RES 150Ohm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07150RL', '38O41409910103', '2546', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-15 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:26', '2026-06-09 10:01:26'),
(232, '2026-06-09 17:01:00', '08GY5H', '', '2026030300-1', 'IST', '1051ISTC4000025', 'C-RES 510R +/-0.1% 1/10W 10PPM 0603 RoHS', 'RT0603BRB07510RL', '18O5050049', '2604', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:35', '2026-06-09 10:01:35'),
(233, '2026-06-09 17:01:00', '08GY59', '', '2026030300-1', 'IST', '1051ISTC4000025', 'C-RES 510R +/-0.1% 1/10W 10PPM 0603 RoHS', 'RT0603BRB07510RL', '18P0410007', '2605', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:43', '2026-06-09 10:01:43'),
(234, '2026-06-09 17:01:00', '08LC9B', '', '2026051200-1', 'IST', '1051ISTC154F011', 'C-RES 150 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07150KL', '38P0350377', '2616', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:01:58', '2026-06-10 00:37:51'),
(236, '2026-06-09 17:02:00', '07T13W', '', '2025032000-1', 'IST', '1091ISTLEMC3225', 'INDUCTOR B82422-A1103-K100,10UH,+/-10%', 'B82422A1103K100V3', '0043781381', '240530', '0', 2000, 2000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-30 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:02:30', '2026-06-09 10:02:30'),
(237, '2026-06-09 17:02:00', '07TMGD', '', '2025032800-1', 'IST', '1091ISTLEMC3225', 'INDUCTOR B82422-A1103-K100,10UH,+/-10%', 'B82422A1103K100V3', '0044986586', '250110', '0', 2000, 376, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-01-10 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:02:39', '2026-06-09 10:02:39'),
(238, '2026-06-09 17:02:00', '08FKX2', '', '2026021100-1', 'IST', '1061ISTD4000047', 'DIODE SMD  TPD1E10B06DPYR RoHS', 'TPD1E10B06DPYR', '1444689ZHG', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-11 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:02:53', '2026-06-09 16:10:01'),
(239, '2026-06-09 17:02:00', '05QEZO', '', '2022062200-1', 'IST', '8041ISTC6000191', 'CAP; SMD0402; 2.2µF; ±10%; 6.3V; X5R', 'GRM155C71A225KE11D', 'IA1924CR7', '240921', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:03:10', '2026-06-09 10:03:10'),
(240, '2026-06-09 17:03:00', '847126231009', '', '2022062200-1', 'IST', '8041ISTC6000191', 'CAP; SMD0402; 2.2µF; ±10%; 6.3V; X5R', 'GRM155C71A225KE11D', 'IA1924CR7', '240921', '0', 6940, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:03:27', '2026-06-11 03:11:30'),
(241, '2026-06-09 17:03:00', '05QEZM', '', '2022062200-1', 'IST', '8041ISTC6000191', 'CAP; SMD0402; 2.2µF; ±10%; 6.3V; X5R', 'GRM155C71A225KE11D', 'IA1924CR7', '240921', '0', 10000, 9995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 10:03:39', '2026-06-09 10:03:39'),
(242, '2026-06-09 17:03:00', '08D32P', '', '2026010900-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D06U87', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:06', '2026-06-10 00:37:41'),
(243, '2026-06-09 17:04:00', '08D32U', '', '2026010900-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D06U87', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:15', '2026-06-10 13:06:59'),
(244, '2026-06-09 17:04:00', '08ETY2', '', '2026013000-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D19U29', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-23 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:25', '2026-06-10 13:08:27'),
(245, '2026-06-09 17:04:00', '08ETY3', '', '2026013000-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D19U29', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:34', '2026-06-09 10:04:34'),
(246, '2026-06-09 17:04:00', '08ETY0', '', '2026013000-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D19U29', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-23 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:43', '2026-06-11 03:08:26'),
(247, '2026-06-09 17:04:00', '08ETY1', '', '2026013000-1', 'IST', '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', 'GRM1555C1H101JA01', 'IA5D19U29', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-23 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:04:51', '2026-06-11 00:56:19'),
(248, '2026-06-09 17:04:00', '08D3C4', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D08C09', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:10', '2026-06-10 00:36:44'),
(249, '2026-06-09 17:05:00', '08D3C0', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:20', '2026-06-11 00:55:54'),
(250, '2026-06-09 17:05:00', '08D3BI', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:29', '2026-06-09 10:05:29'),
(251, '2026-06-09 17:05:00', '08D3CA', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:40', '2026-06-09 10:05:40'),
(252, '2026-06-09 17:05:00', '08D3C9', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:50', '2026-06-09 10:05:50'),
(253, '2026-06-09 17:05:00', '08D3B5', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:05:59', '2026-06-09 10:05:59'),
(254, '2026-06-09 17:05:00', '08D3C1', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:08', '2026-06-09 10:06:08'),
(255, '2026-06-09 17:06:00', '08D3C2', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:17', '2026-06-09 10:06:17'),
(256, '2026-06-09 17:06:00', '08D3B4', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:27', '2026-06-10 13:06:10'),
(257, '2026-06-09 17:06:00', '08D3BZ', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:36', '2026-06-09 10:06:36'),
(258, '2026-06-09 17:06:00', '08D3CC', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:46', '2026-06-09 10:06:46'),
(259, '2026-06-09 17:06:00', '08D3C3', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D08C09', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:06:56', '2026-06-09 10:06:56'),
(260, '2026-06-09 17:06:00', '08D3CB', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:07:06', '2026-06-09 10:07:06'),
(261, '2026-06-09 17:07:00', '08D3B6', '', '2026010900-1', 'IST', '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', 'GRM155R71H103JA88D', 'IA5D13EN7', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:07:18', '2026-06-09 10:07:18'),
(262, '2026-06-09 17:07:00', '08D6B0', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:07:54', '2026-06-09 10:07:54'),
(263, '2026-06-09 17:07:00', '08D6CI', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:08:04', '2026-06-11 03:08:31'),
(264, '2026-06-09 17:08:00', '08D6CJ', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:08:22', '2026-06-11 00:55:36'),
(265, '2026-06-09 17:08:00', '08D6BS', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 3504, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:08:31', '2026-06-09 10:08:31'),
(266, '2026-06-09 17:08:00', '08D6BU', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:08:40', '2026-06-09 10:08:40'),
(267, '2026-06-09 17:08:00', '08D6B1', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:08:54', '2026-06-10 00:37:46'),
(269, '2026-06-09 17:09:00', '08D6B8', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:09:28', '2026-06-09 10:09:28'),
(270, '2026-06-09 17:09:00', '08D6B3', '', '2026010900-1', 'IST', '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', 'GRM1555C1H470JA01D', 'IA5D02UQ2', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-31 00:00:00', '', '', '3', '2', '3', NULL, '2026-06-09 10:09:38', '2026-06-10 16:09:33'),
(271, '2026-06-09 17:09:00', '086IAT', '', '2025100300-1', 'IST', '8041ISTC4000010', 'C-CAP  220nF 10V/16V 10% X7R 0402 RoHS', 'GRM155R71A224KE01D', 'IA5830AL4', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-27 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:05', '2026-06-09 10:10:05'),
(272, '2026-06-09 17:10:00', '086IAU', '', '2025100300-1', 'IST', '8041ISTC4000010', 'C-CAP  220nF 10V/16V 10% X7R 0402 RoHS', 'GRM155R71A224KE01D', 'IA5830AL4', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-27 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:14', '2026-06-09 10:10:14'),
(273, '2026-06-09 17:10:00', '08B3VX', '', '2025121203-1', 'IST', '1041ISTC4000052', 'C-CAP 470nF10V/16V/25V +/-10% 0603 RoHS', 'CL10B474KP8NNNC', 'BL8NT2L', '2544', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-29 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:25', '2026-06-09 10:10:25'),
(274, '2026-06-09 17:10:00', '089TR8', '', '2025112100-1', 'IST', '8041ISTC4000058', 'C-CAP  33pF 50V +/-5% C0G/NP0 0402 RoHS', 'GRM1555C1H330JA01D', 'IA5O27UC7', '2546', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:38', '2026-06-09 10:10:38'),
(275, '2026-06-09 17:10:00', '089TRC', '', '2025112100-1', 'IST', '8041ISTC4000058', 'C-CAP  33pF 50V +/-5% C0G/NP0 0402 RoHS', 'GRM1555C1H330JA01D', 'IA5O27UC7', '2546', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:45', '2026-06-09 10:10:45'),
(276, '2026-06-09 17:10:00', '085QYM', '', '2025100300-1', 'IST', '8041ISTC4000007', 'C-CAP 22uF 6.3V +/-20% X5R 0805 RoHS', 'GRM219R60J226MEA0', 'FF5827HJ5', '2539', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:10:54', '2026-06-09 10:10:54'),
(277, '2026-06-09 17:10:00', '085QYP', '', '2025100300-1', 'IST', '8041ISTC4000007', 'C-CAP 22uF 6.3V +/-20% X5R 0805 RoHS', 'GRM219R60J226MEA0', 'FF5827HJ5', '2539', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:02', '2026-06-09 10:11:02'),
(278, '2026-06-09 17:11:00', '088BOD', '', '2025103100-1', 'IST', '8041ISTC4000007', 'C-CAP 22uF 6.3V +/-20% X5R 0805 RoHS', 'GRM219R60J226MEA0', 'FF5923HC8', '2543', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:10', '2026-06-09 10:11:10'),
(279, '2026-06-09 17:11:00', '086K2G', '', '2025100300-1', 'IST', '8041ISTC4000012', 'C-CAP  1.5nF 50V +/-5% C0G/NP0 0603 RoHS', 'GRM1885C1H152JA01D', 'IA5904EK8', '2539', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:18', '2026-06-09 10:11:18'),
(280, '2026-06-09 17:11:00', '086ID1', '', '2025100300-1', 'IST', '8041ISTC4000011', 'C-CAP 15pF 50V +/-2% C0G/NP0 0402 RoHS', 'GRM1555C1H150GA01D', 'IA5903UJ6', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:35', '2026-06-09 10:11:35'),
(281, '2026-06-09 17:11:00', '086ID0', '', '2025100300-1', 'IST', '8041ISTC4000011', 'C-CAP 15pF 50V +/-2% C0G/NP0 0402 RoHS', 'GRM1555C1H150GA01D', 'IA5903UJ6', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:42', '2026-06-09 10:11:42'),
(282, '2026-06-09 17:11:00', '086A05', '', '2025100300-1', 'IST', '8041ISTC4000048', 'C-CAP  1.0pF 50V +/-0.05pF C0G 0402 RoHS', 'GRM1555C1H1R0WA01D', 'IA5908V12', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:11:58', '2026-06-09 10:11:58'),
(283, '2026-06-09 17:11:00', '086A04', '', '2025100300-1', 'IST', '8041ISTC4000048', 'C-CAP  1.0pF 50V +/-0.05pF C0G 0402 RoHS', 'GRM1555C1H1R0WA01D', 'IA5908V12', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '1', NULL, '2026-06-09 10:12:05', '2026-06-09 10:12:05'),
(284, '2026-06-09 17:12:00', '086IAJ', '', '2025100300-1', 'IST', '8041ISTC150J101', 'C-CAP 15pF 10V +/-5% COG 0402 RoHS', 'GRM1555C1H150JA01D', 'IA5722UN0', '20250926', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:12:41', '2026-06-09 10:12:41'),
(285, '2026-06-09 17:12:00', '086IAI', '', '2025100300-1', 'IST', '8041ISTC150J101', 'C-CAP 15pF 10V +/-5% COG 0402 RoHS', 'GRM1555C1H150JA01D', 'IA5722UN0', '20250926', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:12:50', '2026-06-09 10:12:50'),
(286, '2026-06-09 17:12:00', '083BBI', '', '2025082900-1', 'IST', '8041ISTC1R0B001', 'C-CAP 1pF 50V +/- 0.1pF COG  0402 RoHS', 'GRM1555C1H1R0BA01D', 'IA5731UV0', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:13:07', '2026-06-09 10:13:07'),
(287, '2026-06-09 17:13:00', '083BBJ', '', '2025082900-1', 'IST', '8041ISTC1R0B001', 'C-CAP 1pF 50V +/- 0.1pF COG  0402 RoHS', 'GRM1555C1H1R0BA01D', 'IA5731UV0', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:13:17', '2026-06-09 10:13:17'),
(288, '2026-06-09 17:13:00', '086ICJ', '', '2025100300-1', 'IST', '8041ISTC120G501', 'C-CAP 12pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H120GA01D', 'IA5904V12', '20250926', '0', 10000, 5654, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:13:30', '2026-06-09 10:13:30'),
(289, '2026-06-09 17:13:00', '086ICL', '', '2025100300-1', 'IST', '8041ISTC120G501', 'C-CAP 12pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H120GA01D', 'IA5904V12', '20250926', '0', 10000, 3994, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:13:37', '2026-06-09 10:13:37'),
(290, '2026-06-09 17:13:00', '07E73Y', '', '2023062200-1', 'IST', '1041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', 'GCM1555C1H2R7CA16', '2023062200', '20230602', '0', 10000, 6280, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L3 Box 2 Slot 4', '3', '3', '2', NULL, '2026-06-09 10:13:49', '2026-06-11 01:37:28'),
(291, '2026-06-09 17:13:00', '07E741', '', '2023062200-1', 'IST', '1041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', 'GCM1555C1H2R7CA16', '2023062200', '20230602', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L3 Box 2 Slot 4', '3', '3', '2', NULL, '2026-06-09 10:13:58', '2026-06-11 01:37:28'),
(292, '2026-06-09 17:13:00', '07E8Y6', '', '2023053100-1', 'IST', '1041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG RoHS', 'GRM1555C1H120GA01', '2023053100', '2317', '0', 10000, 8622, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L3 Box 2 Slot 5', '3', '3', '2', NULL, '2026-06-09 10:14:11', '2026-06-11 01:37:28'),
(293, '2026-06-09 17:14:00', '07E8ZW', '', '2023053100-1', 'IST', '1041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG RoHS', 'GRM1555C1H120GA01', '2023053100', '2315', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L3 Box 2 Slot 5', '3', '3', '2', NULL, '2026-06-09 10:14:20', '2026-06-11 01:37:28'),
(294, '2026-06-09 17:14:00', '07E9YR', '', '2023071800-1', 'IST', '1041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', '2023071800', '20230622', '0', 10000, 7228, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L3 Box 2 Slot 6', '3', '3', '2', NULL, '2026-06-09 10:14:31', '2026-06-11 01:37:28'),
(295, '2026-06-09 17:14:00', '847126231007', '', '202206140A-1', 'IST', '1041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', '', '130321', '0', 2675, 2675, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-29 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:14:40', '2026-06-09 10:14:40'),
(296, '2026-06-09 17:14:00', '07E77C', '', '2023053000-1', 'IST', '1041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', 'GRM155R61C105KA12', '', '310323', '0', 10000, 9990, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-29 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:14:49', '2026-06-09 10:14:49'),
(297, '2026-06-09 17:14:00', '84712623100C', '', '2023122700-1', 'IST', '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01D', 'IA3N01UV4', '2344', '0', 760, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-18 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:15:02', '2026-06-11 03:06:48'),
(298, '2026-06-09 17:15:00', '07EAMH', '', '2023122700-1', 'IST', '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01D', 'IA3N01UV4', '2344', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:15:19', '2026-06-09 10:15:19'),
(299, '2026-06-09 17:15:00', '07EAMJ', '', '2023122700-1', 'IST', '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01D', 'IA3N01UV4', '2344', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:15:31', '2026-06-09 10:15:31');
INSERT INTO `inventory_receive` (`id`, `ReceiveDate`, `PUID`, `ReservationNo`, `IM`, `Customer`, `HanaPart`, `Description`, `MnfPartNo`, `LotNo`, `DateCode`, `BinSize`, `Qty`, `QtyRemain`, `McID`, `MachineName`, `StatusName`, `ExpirationDate`, `OldIM`, `Remark`, `Loc_Shelf`, `Loc_Level`, `Loc_Box`, `ExpireDate_RoomTemp`, `created_at`, `updated_at`) VALUES
(300, '2026-06-09 17:15:00', '07EAMK', '', '2023122700-1', 'IST', '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01D', 'IA3N01UV4', '2344', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:15:43', '2026-06-09 10:15:43'),
(301, '2026-06-09 17:15:00', '07EAMI', '', '2023122700-1', 'IST', '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', 'GRM1555C1H6R2CA01D', 'IA3N01UV4', '2344', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-18 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:15:55', '2026-06-09 10:15:55'),
(302, '2026-06-09 17:15:00', '08KDBP', '', '2026042900-1', 'IST', '1091ISTC82NH040', 'C-IND 8.2nH +/-5% 0402 RoHS', 'CLH1005T-8N2J-S', 'DD63090B', '20260410', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-09 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:16:03', '2026-06-10 00:38:35'),
(303, '2026-06-09 17:16:00', '08KDC0', '', '2026042900-1', 'IST', '1091ISTC82NH040', 'C-IND 8.2nH +/-5% 0402 RoHS', 'CLH1005T-8N2J-S', 'DD63090B', '20260410', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-04-09 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:16:11', '2026-06-09 10:16:11'),
(304, '2026-06-09 17:16:00', '08KDBZ', '', '2026042900-1', 'IST', '1091ISTC82NH040', 'C-IND 8.2nH +/-5% 0402 RoHS', 'CLH1005T-8N2J-S', 'DD63090B', '20260410', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-04-09 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:16:21', '2026-06-09 10:16:21'),
(305, '2026-06-09 17:16:00', '08KDC1', '', '2026042900-1', 'IST', '1091ISTC82NH040', 'C-IND 8.2nH +/-5% 0402 RoHS', 'CLH1005T-8N2J-S', 'DD63090B', '20260410', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-04-09 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:16:32', '2026-06-10 05:31:19'),
(306, '2026-06-09 17:16:00', '083BM8', '', '2025082900-1', 'IST', '8041ISTC4000019', 'C-CAP  3.0pF 50V +/-0,25pF C0G/NP0 0402', 'GRM1555C1H3R0CA01D', 'IA5725U43', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:16:48', '2026-06-09 10:16:48'),
(307, '2026-06-09 17:16:00', '084DGQ', '', '2025082900-1', 'IST', '8041ISTC4000051', 'C-CAP  2.2nF 50V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5724CL6', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:17:00', '2026-06-09 10:17:00'),
(308, '2026-06-09 17:17:00', '08D5F6', '', '2026010900-1', 'IST', '8041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5D15E35', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:17:25', '2026-06-10 00:38:40'),
(309, '2026-06-09 17:17:00', '08D5F7', '', '2026010900-1', 'IST', '8041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5D15E35', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:17:36', '2026-06-09 10:17:36'),
(310, '2026-06-09 17:17:00', '08D5F8', '', '2026010900-1', 'IST', '8041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5D15E35', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:17:45', '2026-06-09 10:17:45'),
(311, '2026-06-09 17:17:00', '08D5F3', '', '2026010900-1', 'IST', '8041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5D15E35', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:17:57', '2026-06-10 13:05:03'),
(312, '2026-06-09 17:17:00', '08AF69', '', '2025120500-1', 'IST', '8041ISTC4000034', 'C-CAP  12pF 50V +/-2% C0G/NP0 0402 RoHS', 'GRM1555C1H120GA01D', 'IA5N07UA8', '2547', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-21 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:05', '2026-06-09 10:18:05'),
(313, '2026-06-09 17:18:00', '08AF6E', '', '2025120500-1', 'IST', '8041ISTC4000034', 'C-CAP  12pF 50V +/-2% C0G/NP0 0402 RoHS', 'GRM1555C1H120GA01D', 'IA5N07UA8', '2547', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-21 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:12', '2026-06-09 10:18:12'),
(314, '2026-06-09 17:18:00', '083BL4', '', '2025082900-1', 'IST', '8041ISTC4000057', 'C-CAP  2.2pF 50V +/-0,25pF C0G/NP0 0402', 'GRM1555C1H2R2BA01D', 'IA5729US0', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:20', '2026-06-09 10:18:20'),
(315, '2026-06-09 17:18:00', '083BL7', '', '2025082900-1', 'IST', '8041ISTC4000057', 'C-CAP  2.2pF 50V +/-0,25pF C0G/NP0 0402', 'GRM1555C1H2R2BA01D', 'IA5729US0', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:28', '2026-06-09 10:18:28'),
(316, '2026-06-09 17:18:00', '086IB8', '', '2025100300-1', 'IST', '8041ISTC4000059', 'C-CAP  100pF 50V +/-5% C0G/NP0 0402 RoHS', 'GRM1555C1H101JA01D', 'IA5910VE8', '20250926', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:35', '2026-06-09 10:18:35'),
(317, '2026-06-09 17:18:00', '086IB7', '', '2025100300-1', 'IST', '8041ISTC4000059', 'C-CAP  100pF 50V +/-5% C0G/NP0 0402 RoHS', 'GRM1555C1H101JA01D', 'IA5910VE8', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:43', '2026-06-09 10:18:43'),
(318, '2026-06-09 17:18:00', '08ARF9', '', '2025120500-1', 'IST', '8041ISTC154K161', 'C-CAP 150nF 10V +/-10% X7R 0402 RoHS', 'GRM155R61A154KE19D', 'IA5N05FV7', '2548', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:18:53', '2026-06-10 00:38:56'),
(319, '2026-06-09 17:18:00', '08ARFA', '', '2025120500-1', 'IST', '8041ISTC154K161', 'C-CAP 150nF 10V +/-10% X7R 0402 RoHS', 'GRM155R61A154KE19D', 'IA5N05FV7', '2548', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-28 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:01', '2026-06-11 00:56:32'),
(320, '2026-06-09 17:19:00', '08ARF7', '', '2025120500-1', 'IST', '8041ISTC154K161', 'C-CAP 150nF 10V +/-10% X7R 0402 RoHS', 'GRM155R61A154KE19D', 'IA5N05FV7', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:08', '2026-06-09 10:19:08'),
(321, '2026-06-09 17:19:00', '07B5OF', '', '202205230B-1', 'IST', '1081ISTC2000303', 'X-TAL 26MHz,16PF,10ppm,SMD3225 RoHS', 'X3165012426000AVTX', 'PM2107043', '040422', '0', 3000, 2864, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-09 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:18', '2026-06-09 10:19:18'),
(322, '2026-06-09 17:19:00', '08IIQT', '', '2026040300-1', 'IST', '1081ISTC4000114', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', '10-0767', '20260401', '20260401', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-01 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:27', '2026-06-09 10:19:27'),
(323, '2026-06-09 17:19:00', '08IIQU', '', '2026040300-1', 'IST', '1081ISTC4000114', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', '10-0767', '20260401', '20260401', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-01 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:35', '2026-06-09 10:19:35'),
(324, '2026-06-09 17:19:00', '08IIQX', '', '2026040300-1', 'IST', '1081ISTC4000114', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', '10-0767', '20260401', '20260401', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-01 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:42', '2026-06-09 10:19:42'),
(325, '2026-06-09 17:19:00', '08IIQW', '', '2026040300-1', 'IST', '1081ISTC4000114', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', '10-0767', '20260401', '20260401', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-01 00:00:00', '', '', '3', '3', '3', NULL, '2026-06-09 10:19:49', '2026-06-09 10:19:49'),
(326, '2026-06-09 17:19:00', '08DF23', '', '2026011300-1', 'IST', '1061ISTD4000084', 'DIODE SMD  BAT54CW RoHS', 'BAT54CW', 'TBPE2806260A', '2529', '0', 3000, 1528, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-18 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:20:20', '2026-06-09 10:20:20'),
(327, '2026-06-09 17:20:00', '08DF2B', '', '2026011300-1', 'IST', '1061ISTD4000084', 'DIODE SMD  BAT54CW RoHS', 'BAT54CW', 'TBPE4412120A', '2545', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-18 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:20:31', '2026-06-09 10:20:31'),
(328, '2026-06-09 17:20:00', '08DF29', '', '2026011300-1', 'IST', '1061ISTD4000084', 'DIODE SMD  BAT54CW RoHS', 'BAT54CW', 'TBPE4412120A', '2545', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-18 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:20:41', '2026-06-09 10:20:41'),
(329, '2026-06-09 17:20:00', '08DF24', '', '2026011300-1', 'IST', '1061ISTD4000084', 'DIODE SMD  BAT54CW RoHS', 'BAT54CW', 'TBPE4110090A', '2542', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-18 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:20:49', '2026-06-09 10:20:49'),
(330, '2026-06-09 17:20:00', '08JO5L', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B23', '20260312', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:00', '2026-06-10 00:37:55'),
(331, '2026-06-09 17:21:00', '08JO5M', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B23', '20260312', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:09', '2026-06-09 10:21:09'),
(332, '2026-06-09 17:21:00', '08JO1Y', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B1A', '20260312', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:18', '2026-06-09 10:21:18'),
(333, '2026-06-09 17:21:00', '08JO38', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B1C', '20260312', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:28', '2026-06-11 00:56:10'),
(334, '2026-06-09 17:21:00', '08JO1X', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B1A', '20260312', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:36', '2026-06-10 13:13:28'),
(335, '2026-06-09 17:21:00', '08JO4A', '', '2026041000-1', 'IST', '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', 'CS0402-3N3G-S', 'DA610B72', '20260312', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:21:45', '2026-06-10 10:04:56'),
(336, '2026-06-09 17:21:00', '08F329', '', '2026021200-1', 'IST', '1051ISTC2000429', 'C-RES 15MOhm +/-5% 1/16W 0805 RoHS', 'RC0805JR-0715ML', '38O44107610012', '2604', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-12 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:22:00', '2026-06-09 10:22:00'),
(337, '2026-06-09 17:22:00', '08F32A', '', '2026021200-1', 'IST', '1051ISTC2000429', 'C-RES 15MOhm +/-5% 1/16W 0805 RoHS', 'RC0805JR-0715ML', '38O44107610013', '2604', '0', 5000, 5000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-12 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:22:26', '2026-06-09 10:22:26'),
(338, '2026-06-09 17:22:00', '08E51P', '', '2026012200-1', 'IST', '1021ISTI4000080', 'SWT 1:2 SPDT Analog RoHS', 'TS5A9411DCKR', '5705114HNA', '2528', '0', 3000, 2170, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-07-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:22:37', '2026-06-09 10:22:37'),
(339, '2026-06-09 17:22:00', '089BTZ', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA580844', '20251009', '0', 4000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:22:55', '2026-06-11 03:05:52'),
(340, '2026-06-09 17:22:00', '089BTP', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA580843', '20251009', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:08', '2026-06-09 10:23:08'),
(341, '2026-06-09 17:23:00', '089BTC', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:18', '2026-06-09 10:23:18'),
(342, '2026-06-09 17:23:00', '089BTD', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:27', '2026-06-09 10:23:27'),
(343, '2026-06-09 17:23:00', '089BTF', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:38', '2026-06-09 10:23:38'),
(344, '2026-06-09 17:23:00', '089BT9', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:47', '2026-06-09 10:23:47'),
(345, '2026-06-09 17:23:00', '089BTE', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:23:57', '2026-06-09 10:23:57'),
(346, '2026-06-09 17:23:00', '089BTM', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA5801D5', '20250911', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:06', '2026-06-09 10:24:06'),
(347, '2026-06-09 17:24:00', '089BTN', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA5801D5', '20250911', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:15', '2026-06-09 10:24:15'),
(348, '2026-06-09 17:24:00', '089BTY', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA5801D5', '20250911', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:23', '2026-06-09 10:24:23'),
(349, '2026-06-09 17:24:00', '089BTX', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA5801D5', '20250911', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:31', '2026-06-09 10:24:31'),
(350, '2026-06-09 17:24:00', '089BTA', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:39', '2026-06-09 10:24:39'),
(351, '2026-06-09 17:24:00', '089BTW', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA5801D5', '20250911', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:24:49', '2026-06-09 10:24:49'),
(352, '2026-06-09 17:24:00', '089BTB', '', '2025111200-1', 'IST', '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', 'CS0402-9N5G-S', 'DA58083F', '20250925', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-11 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:25:06', '2026-06-09 10:25:06'),
(353, '2026-06-09 17:26:00', '06ON9S', '', '2023090100-1', 'IST', '1051ISTNTCTHER0', 'NTC THERMISTOR R25=100K OHM,+/-5%, SOD80', 'NTCSMELFE3104JT', '2212325201', '2325', '0', 2500, 178, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-06-04 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:26:32', '2026-06-09 10:26:32'),
(354, '2026-06-09 17:26:00', '06QG8Y', '', '2023092700-1', 'IST', '1051ISTNTCTHER0', 'NTC THERMISTOR R25=100K OHM,+/-5%, SOD80', 'NTCSMELFE3104JT', '2212333601', '2333', '0', 2500, 2500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-06-04 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:26:43', '2026-06-09 10:26:43'),
(355, '2026-06-09 17:26:00', '844126120C3A', '', '2022042800-1', 'IST', '8091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', 'LQG15HS7N5J02', 'YF1313081', '110521', '0', 9980, 9975, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-04-01 00:00:00', '', '', '3', '4', '1', NULL, '2026-06-09 10:27:36', '2026-06-09 10:27:36'),
(356, '2026-06-09 17:27:00', '07E9TS', '', '2023062200-1', 'IST', '1041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '2023062200', '20230517', '0', 4000, 240, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L4 Box 2 Slot 7', '3', '4', '2', NULL, '2026-06-09 10:28:34', '2026-06-11 01:37:28'),
(357, '2026-06-09 17:28:00', '07EB4U', '', '2023081000-1', 'IST', '1041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', 'WG3531A76', '20230714', '0', 4000, 3995, 8251, 'SS12 - ISTA Kitting Store SMT', 'Is Blocked', '2026-05-29 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:28:46', '2026-06-09 10:28:46'),
(358, '2026-06-09 17:28:00', '07E9TQ', '', '2023062200-1', 'IST', '1041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', 'GRM188R60J226MEA0', '2023062200', '20230517', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-09 00:00:00', '', 'Rack 3 L4 Box 2 Slot 7', '3', '4', '2', NULL, '2026-06-09 10:28:56', '2026-06-11 01:37:28'),
(359, '2026-06-09 17:28:00', '07R7O9', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:08', '2026-06-11 03:06:14'),
(360, '2026-06-09 17:29:00', '07R7OA', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:16', '2026-06-09 10:29:16'),
(361, '2026-06-09 17:29:00', '07R7O8', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:25', '2026-06-09 10:29:25'),
(362, '2026-06-09 17:29:00', '07R7O7', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:32', '2026-06-09 10:29:32'),
(363, '2026-06-09 17:29:00', '07R7OD', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:40', '2026-06-09 10:29:40'),
(364, '2026-06-09 17:29:00', '07R7OE', '', '2025022700-1', 'IST', '1051ISTR6000201', 'RES; SMD0402; 200k?; ±1%; 1/16W; 100ppm', 'RC0402FR-07200KL', '38N4270009', '2504', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-02-27 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:47', '2026-06-09 10:29:47'),
(365, '2026-06-09 17:29:00', '06O8WJ', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M20113460010', '2321', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:29:57', '2026-06-11 03:06:26'),
(366, '2026-06-09 17:29:00', '06O8WG', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M20113460004', '2322', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:05', '2026-06-09 10:30:05'),
(367, '2026-06-09 17:30:00', '06O8WK', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M20113460011', '2321', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:13', '2026-06-09 10:30:13'),
(368, '2026-06-09 17:30:00', '06O8WN', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M20113460015', '2322', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:21', '2026-06-09 10:30:21'),
(369, '2026-06-09 17:30:00', '06O8WF', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M18702040060', '2321', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:29', '2026-06-09 10:30:29'),
(370, '2026-06-09 17:30:00', '06O8WI', '', '2023082500-1', 'IST', '1051ISTR6000202', 'RES; SMD0402; 66.5k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0766K5L', '38M20113460009', '2321', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-05-26 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:37', '2026-06-09 10:30:37'),
(371, '2026-06-09 17:30:00', '06OA1L', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890018', '2313', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:30:53', '2026-06-11 03:06:35'),
(372, '2026-06-09 17:30:00', '06OA1N', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890020', '2313', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:31:04', '2026-06-09 10:31:04'),
(373, '2026-06-09 17:31:00', '06OA1V', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890016', '2313', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:31:13', '2026-06-09 10:31:13'),
(374, '2026-06-09 17:31:00', '06OA1X', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890049', '2313', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:31:22', '2026-06-09 10:31:22'),
(375, '2026-06-09 17:31:00', '06OA1W', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890048', '2313', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:31:30', '2026-06-09 10:31:30'),
(376, '2026-06-09 17:31:00', '06OA1M', '', '2023082500-1', 'IST', '1051ISTR6000203', 'RES; SMD0402; 33.2k?; ±1%; 1/16W; 100ppm', 'RC0402FR-0733K2L', '38M12308890067', '2313', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-03-31 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:31:51', '2026-06-09 10:31:51'),
(377, '2026-06-11 03:37:00', '08127M', '', '2025071000-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '38O0911284', '2515', '0', 10000, 1136, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-04-11 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:32:01', '2026-06-11 01:37:25'),
(378, '2026-06-09 17:32:00', '07SIOQ', '', '2025031200-1', 'IST', '1051ISTR6000211', 'RES; SMD0402; 4.7k?; ±1%; 1/16W; 100ppm', 'RC0402FR-074K7L', '38N2770085', '2434', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-12 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:32:12', '2026-06-11 03:06:42'),
(379, '2026-06-09 17:32:00', '0896YN', '', '2025110700-1', 'IST', '8061ISTD6000401', 'ESD protection diode', 'ESD321DPYR', '5630367CD5', '2529', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2030-07-17 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:32:18', '2026-06-11 03:06:07'),
(380, '2026-06-09 17:32:00', '0896YL', '', '2025110700-1', 'IST', '8061ISTD6000401', 'ESD protection diode', 'ESD321DPYR', '5630367CD5', '2529', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2030-07-17 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:32:25', '2026-06-09 10:32:25'),
(381, '2026-06-09 17:32:00', '0896YM', '', '2025110700-1', 'IST', '8061ISTD6000401', 'ESD protection diode', 'ESD321DPYR', '5630367CD5', '2529', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2030-07-17 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-09 10:32:32', '2026-06-09 10:32:32'),
(382, '2026-06-09 17:32:00', '08BLHT', '', '2025122300-1', 'IST', '1051ISTC4000081', 'C-RES 270kOhm  +/-1% 1/16W 0402 RoHS', 'RC0402FR-07270KL', '38O3670950', '2546', '0', 10000, 1600, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:32:53', '2026-06-09 10:32:53'),
(383, '2026-06-09 17:32:00', '084DCY', '', '2025090400-1', 'IST', '1051ISTC4000081', 'C-RES 270kOhm  +/-1% 1/16W 0402 RoHS', 'RC0402FR-07270KL', '38N32212360081', '2433', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-08-16 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:01', '2026-06-09 10:33:01'),
(384, '2026-06-09 17:33:00', '089746', '', '2025110100-1', 'IST', '8091ISTC4000017', 'C-IND  10nH +/-2% 0402  RoHS', 'LQW15AN10NG00D', 'ML5924945', '2543', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:10', '2026-06-09 10:33:10'),
(385, '2026-06-09 17:33:00', '08D3AC', '', '2026010900-1', 'IST', '8041ISTC221K161', 'C-CAP 220pF 16V +/-10% COG 0402 RoHS', 'GRM1555C1H221JA01D', 'IA5O17U85', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:21', '2026-06-10 00:38:54'),
(386, '2026-06-09 17:33:00', '08D90Z', '', '2026010900-1', 'IST', '8041ISTC4000040', 'C-CAP 10UF 50V 1210 10% X7R RoHS', 'GRM32ER71H106KA12L', 'PC5N07CE9', '2546', '0', 1000, 150, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:37', '2026-06-09 10:33:37'),
(387, '2026-06-09 17:33:00', '086KY4', '', '2025101100-1', 'IST', '8091ISTC4000015', 'C-IND  7.5nH +/-2% 0402  RoHS', 'LQW15AN7N5G00D', 'ML5812B45', '2539', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-26 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:45', '2026-06-09 10:33:45'),
(388, '2026-06-09 17:33:00', '08G79T', '', '2026021800-1', 'IST', '1161ISTF2000249', 'POLY FUSE 2.3Ohm 15V 25A 1206 RoHS', '1206L025YR', 'CB7SO2', '08/27/25', '0', 4000, 4000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-27 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:33:56', '2026-06-09 10:33:56'),
(389, '2026-06-09 17:33:00', '08LC6R', '', '2025073000-1', 'IST', '1051ISTC102K100', 'C-RES,1KOHM,+/-10% 0402,063W RoHS', 'RC0402JR-071KL', '38O21611590218', '2526', '0', 5047, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-06-27 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:11', '2026-06-11 03:11:40'),
(390, '2026-06-09 17:34:00', '087OSS', '', '2025102900-1', 'IST', '1051ISTC102K100', 'C-RES,1KOHM,+/-10% 0402,063W RoHS', 'RC0402JR-071KL', '38O27216500171', '2528', '0', 10000, 3472, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-04 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:20', '2026-06-09 10:34:20'),
(391, '2026-06-09 17:34:00', '087OST', '', '2025102900-1', 'IST', '1051ISTC102K100', 'C-RES,1KOHM,+/-10% 0402,063W RoHS', 'RC0402JR-071KL', '38O27216500225', '2528', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-04 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:30', '2026-06-09 10:34:30'),
(392, '2026-06-09 17:34:00', '087OSV', '', '2025102900-1', 'IST', '1051ISTC102K100', 'C-RES,1KOHM,+/-10% 0402,063W RoHS', 'RC0402JR-071KL', '38O27216500106', '2528', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-07-04 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:38', '2026-06-09 10:34:38'),
(393, '2026-06-09 17:34:00', '08GAN9', '', '2026030300-1', 'IST', '1051ISTC4000041', 'C-RES 430K +/-1% 1/16W 100PPM 0402 RoHS', 'RC0402FR-07430KL', '38O4961236', '2604', '0', 10000, 2110, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:45', '2026-06-09 10:34:45'),
(394, '2026-06-09 17:34:00', '08EL4X', '', '2026012700-1', 'IST', '1081ISTC4000113', 'XTAL 32768HZ 12.5PF SMD 3215', 'CM315D32768EZFT', '5Z010', '2549', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-05 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:34:55', '2026-06-09 10:34:55'),
(395, '2026-06-09 17:34:00', '08EL4V', '', '2026012700-1', 'IST', '1081ISTC4000113', 'XTAL 32768HZ 12.5PF SMD 3215', 'CM315D32768EZFT', '5Z007', '2549', '0', 3000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2027-12-05 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:35:02', '2026-06-09 16:10:03'),
(396, '2026-06-09 17:35:00', '089U0B', '', '2025112100-1', 'IST', '8041ISTC1R5B001', 'C-CAP 1.5pF 16V +/- 0.1pF COG 0402 RoHS', 'GRM1555C1H1R5BA01D', 'IA5O21U40', '2546', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-14 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:35:12', '2026-06-10 00:38:38'),
(397, '2026-06-09 17:35:00', '089U09', '', '2025112100-1', 'IST', '8041ISTC1R5B001', 'C-CAP 1.5pF 16V +/- 0.1pF COG 0402 RoHS', 'GRM1555C1H1R5BA01D', 'IA5O21U40', '2546', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-11-14 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:35:20', '2026-06-11 00:54:46'),
(398, '2026-06-09 17:35:00', '089U0A', '', '2025112100-1', 'IST', '8041ISTC1R5B001', 'C-CAP 1.5pF 16V +/- 0.1pF COG 0402 RoHS', 'GRM1555C1H1R5BA01D', 'IA5O21U40', '2546', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-14 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-09 10:35:28', '2026-06-09 10:35:28'),
(399, '2026-06-09 17:35:00', '086BD6', '', '2025092600-1', 'IST', '8041ISTC4000056', 'C-CAP  3.3pF 50V +/-0,25pF C0G/NP0 0402', 'GRM1555C1H3R3CA01D', 'IA5828V13', '2538', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-09-19 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:35:57', '2026-06-09 10:35:57'),
(400, '2026-06-09 17:35:00', '08C5WH', '', '2026010900-1', 'IST', '8041ISTC4000050', 'C-CAP  100nF 16V +/-10% X7R 0402 RoHS', 'GRM155R71C104KA88D', 'IA5D03H57', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:36:05', '2026-06-09 10:36:05'),
(401, '2026-06-09 17:36:00', '08C5WG', '', '2026010900-1', 'IST', '8041ISTC4000050', 'C-CAP  100nF 16V +/-10% X7R 0402 RoHS', 'GRM155R71C104KA88D', 'IA5D03H57', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:36:22', '2026-06-09 10:36:22'),
(402, '2026-06-09 17:36:00', '08C5WF', '', '2026010900-1', 'IST', '8041ISTC4000050', 'C-CAP  100nF 16V +/-10% X7R 0402 RoHS', 'GRM155R71C104KA88D', 'IA5D03H57', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:36:29', '2026-06-09 10:36:29'),
(403, '2026-06-09 17:36:00', '08EKYL', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:36:46', '2026-06-10 00:36:41'),
(404, '2026-06-09 17:36:00', '08EKZG', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:36:53', '2026-06-09 10:36:53'),
(405, '2026-06-09 17:36:00', '08EKZF', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:02', '2026-06-09 10:37:02'),
(406, '2026-06-09 17:37:00', '08EKZH', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:10', '2026-06-09 10:37:10'),
(407, '2026-06-09 17:37:00', '08EKYD', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:18', '2026-06-09 10:37:18'),
(408, '2026-06-09 17:37:00', '08EKYC', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:27', '2026-06-09 10:37:27'),
(409, '2026-06-09 17:37:00', '08EKYN', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:35', '2026-06-11 00:57:21'),
(410, '2026-06-09 17:37:00', '08EKYM', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:43', '2026-06-10 13:13:41'),
(411, '2026-06-09 17:37:00', '08EKYF', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:51', '2026-06-10 10:05:07'),
(412, '2026-06-09 17:37:00', '08EKZC', '', '2026012700-1', 'IST', '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', '2.2.3.260061601', 'PM2511078', '311225', '0', 3000, 3000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-31 00:00:00', '', '', '3', '5', '1', NULL, '2026-06-09 10:37:58', '2026-06-09 10:37:58'),
(413, '2026-06-10 07:41:00', '08EU8F', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6108V45', '2604', '0', 10000, 9500, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:38:28', '2026-06-10 00:41:32'),
(414, '2026-06-09 17:38:00', '08D5G0', '', '2026010900-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA5N28UV3', '2552', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:38:39', '2026-06-10 00:44:29'),
(415, '2026-06-10 05:33:00', '08EU7P', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA5D24US9', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:38:46', '2026-06-10 03:33:18'),
(416, '2026-06-10 05:33:00', '08EU7O', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA5D24US9', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:38:55', '2026-06-11 00:56:03'),
(417, '2026-06-10 05:33:00', '08EU86', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6106U04', '2604', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:03', '2026-06-10 13:08:46'),
(418, '2026-06-09 17:39:00', '08EU87', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA5D25UM0', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:12', '2026-06-09 10:39:12'),
(419, '2026-06-09 17:39:00', '08EU8E', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6108V45', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:20', '2026-06-09 10:39:20'),
(420, '2026-06-09 17:39:00', '08EU8B', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6108V45', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:27', '2026-06-09 10:39:27'),
(421, '2026-06-09 17:39:00', '08EU8A', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6106U04', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:36', '2026-06-09 10:39:36'),
(422, '2026-06-09 17:39:00', '08EU8C', '', '2026013000-1', 'IST', '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', 'GRM1555C1H270GA01D', 'IA6106U04', '2604', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-23 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:39:44', '2026-06-09 10:39:44'),
(423, '2026-06-09 17:39:00', '08F0AS', '', '2026021200-1', 'IST', '1091ISTI2000314', 'C-IND 3.3nH +/0.3nH 0402 RoHS', 'CLH1005T-3N3S-S-NP', 'DD610161001B', '20260122', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-22 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:04', '2026-06-11 00:55:46'),
(424, '2026-06-09 17:40:00', '08F0AW', '', '2026021200-1', 'IST', '1091ISTI2000314', 'C-IND 3.3nH +/0.3nH 0402 RoHS', 'CLH1005T-3N3S-S-NP', 'DD6101610003', '20260122', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-22 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:11', '2026-06-10 13:17:24'),
(425, '2026-06-09 17:40:00', '08F0AX', '', '2026021200-1', 'IST', '1091ISTI2000314', 'C-IND 3.3nH +/0.3nH 0402 RoHS', 'CLH1005T-3N3S-S-NP', 'DD6101610006', '20260122', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-22 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:18', '2026-06-09 10:40:18'),
(426, '2026-06-09 17:40:00', '08F0AZ', '', '2026021200-1', 'IST', '1091ISTI2000314', 'C-IND 3.3nH +/0.3nH 0402 RoHS', 'CLH1005T-3N3S-S-NP', 'DD610161001O', '20260122', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-01-22 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:27', '2026-06-10 00:37:53'),
(427, '2026-06-09 17:40:00', '08H99S', '', '2026030701-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD6108CD0013', '20260205', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:47', '2026-06-10 00:38:20'),
(428, '2026-06-09 17:40:00', '08GZ37', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:40:55', '2026-06-09 10:40:55'),
(429, '2026-06-09 17:40:00', '08GZ38', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:03', '2026-06-09 10:41:03'),
(430, '2026-06-09 17:41:00', '08GZ2T', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:11', '2026-06-09 10:41:11'),
(431, '2026-06-09 17:41:00', '08H990', '', '2026030701-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD6108CD000E', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:18', '2026-06-09 10:41:18'),
(432, '2026-06-09 17:41:00', '08H99O', '', '2026030701-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD6108CD0018', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:35', '2026-06-09 10:41:35'),
(433, '2026-06-09 17:41:00', '08GZ2P', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:43', '2026-06-09 10:41:43'),
(434, '2026-06-09 17:41:00', '08GZ2N', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:50', '2026-06-09 10:41:50'),
(435, '2026-06-09 17:41:00', '08H99Q', '', '2026030701-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD6108CD000Z', '20260205', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:41:58', '2026-06-11 00:57:11'),
(436, '2026-06-10 10:45:00', '08H994', '', '2026030701-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD6108CD000I', '20260205', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:42:06', '2026-06-10 05:31:48'),
(437, '2026-06-10 10:45:00', '08GZ2O', '', '2026030700-1', 'IST', '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', 'CLH1005T-10NJ-S', 'DD610968', '20260205', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2028-02-05 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:42:13', '2026-06-10 13:09:45'),
(438, '2026-06-09 17:42:00', '08A6FE', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 7434, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:42:42', '2026-06-09 10:42:42'),
(439, '2026-06-09 17:42:00', '08A6GO', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:42:51', '2026-06-09 10:42:51'),
(440, '2026-06-09 17:42:00', '08A6GM', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:00', '2026-06-09 10:43:00'),
(441, '2026-06-09 17:43:00', '08A6GK', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:09', '2026-06-09 10:43:09'),
(442, '2026-06-09 17:43:00', '08A6GH', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:19', '2026-06-09 10:43:19'),
(443, '2026-06-09 17:43:00', '08A6GG', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:29', '2026-06-09 10:43:29'),
(444, '2026-06-09 17:43:00', '08A6GL', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:38', '2026-06-09 10:43:38'),
(445, '2026-06-09 17:43:00', '08A6GF', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:49', '2026-06-09 10:43:49'),
(446, '2026-06-09 17:43:00', '08A6GI', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:43:58', '2026-06-09 10:43:58'),
(447, '2026-06-09 17:43:00', '08A6GJ', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:44:08', '2026-06-11 03:11:17'),
(448, '2026-06-09 17:44:00', '08A6FT', '', '2025120200-1', 'IST', '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', 'RC0402FR-0710RL', '38O3850902', '2544', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-10-24 00:00:00', '', '', '3', '5', '2', NULL, '2026-06-09 10:44:17', '2026-06-11 00:52:41'),
(449, '2026-06-09 17:44:00', '08ARGW', '', '2025120500-1', 'IST', '8041ISTC4000009', 'C-CAP  47nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71E473KA88D', 'IA5O24FJ3', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:44:56', '2026-06-09 10:44:56');
INSERT INTO `inventory_receive` (`id`, `ReceiveDate`, `PUID`, `ReservationNo`, `IM`, `Customer`, `HanaPart`, `Description`, `MnfPartNo`, `LotNo`, `DateCode`, `BinSize`, `Qty`, `QtyRemain`, `McID`, `MachineName`, `StatusName`, `ExpirationDate`, `OldIM`, `Remark`, `Loc_Shelf`, `Loc_Level`, `Loc_Box`, `ExpireDate_RoomTemp`, `created_at`, `updated_at`) VALUES
(450, '2026-06-09 17:44:00', '08C665', '', '2026010900-1', 'IST', '8041ISTC4000009', 'C-CAP  47nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71E473KA88D', 'IA5N14ET9', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:45:11', '2026-06-09 10:45:11'),
(451, '2026-06-09 17:45:00', '08C664', '', '2026010900-1', 'IST', '8041ISTC4000009', 'C-CAP  47nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71E473KA88D', 'IA5N14ET9', '2552', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:45:21', '2026-06-09 10:45:21'),
(452, '2026-06-09 17:45:00', '08ARBM', '', '2025120500-1', 'IST', '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71H103KA88D', 'IA5O29EN5', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:45:47', '2026-06-09 10:45:47'),
(453, '2026-06-09 17:45:00', '08ARBR', '', '2025120500-1', 'IST', '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71H103KA88D', 'IA5O29EN5', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:45:55', '2026-06-09 10:45:55'),
(454, '2026-06-09 17:45:00', '08ARBJ', '', '2025120500-1', 'IST', '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71H103KA88D', 'IA5O29EN5', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:46:06', '2026-06-09 10:46:06'),
(455, '2026-06-09 17:46:00', '08ARBL', '', '2025120500-1', 'IST', '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71H103KA88D', 'IA5O29EN5', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:46:18', '2026-06-09 10:46:18'),
(456, '2026-06-09 17:46:00', '08ARBK', '', '2025120500-1', 'IST', '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', 'GRM155R71H103KA88D', 'IA5O29EN5', '2548', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:46:27', '2026-06-09 10:46:27'),
(457, '2026-06-09 17:46:00', '05ON39', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:46:50', '2026-06-11 03:05:35'),
(458, '2026-06-09 17:46:00', '05ON38', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:47:02', '2026-06-11 01:37:28'),
(459, '2026-06-09 17:47:00', '05ON34', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:47:14', '2026-06-11 01:37:28'),
(460, '2026-06-09 17:47:00', '05ON33', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:47:25', '2026-06-11 01:37:28'),
(461, '2026-06-09 17:47:00', '05ON4K', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:47:36', '2026-06-11 01:37:28'),
(462, '2026-06-09 17:47:00', '05ON4G', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:47:49', '2026-06-11 01:37:28'),
(463, '2026-06-09 17:47:00', '05ON37', '', '2022060100-1', 'IST', '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', 'GRM1555C1H120GA01', '2022060100', '20211126', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-16 00:00:00', '', 'Rack 3 L5 Box 3 Slot 2', '3', '5', '3', NULL, '2026-06-09 10:48:01', '2026-06-11 01:37:28'),
(464, '2026-06-09 17:48:00', '08C5XY', '', '2026010900-1', 'IST', '8091ISTC12NHLQW', 'IND MURRATA 12nH 2% LQW15A,0402 RoHS', 'LQW15AN12NG00D', 'ML5N26B72', '2601', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:48:09', '2026-06-09 10:48:09'),
(465, '2026-06-09 17:48:00', '08C5XX', '', '2026010900-1', 'IST', '8091ISTC12NHLQW', 'IND MURRATA 12nH 2% LQW15A,0402 RoHS', 'LQW15AN12NG00D', 'ML5N26B72', '2601', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-26 00:00:00', '', '', '3', '5', '3', NULL, '2026-06-09 10:48:16', '2026-06-09 10:48:16'),
(466, '2026-06-09 17:48:00', '08FK9S', '', '2026020900-1', 'IST', '8031ISTC4000086', 'CONN WECO 950-D-SMD-DS (12 poles) RoHS', '950-D-SMD-DS/12', '296011151231', '2603', '0', 100, 100, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '4', '2', '1', NULL, '2026-06-09 10:48:48', '2026-06-09 10:48:48'),
(467, '2026-06-09 17:48:00', '08GIWQ', '', '2026022600-1', 'IST', '1021ISTI4000039', 'IC TPS7A4101DGN RoHS', 'TPS7A4101DGNR', '5181558UT2', '2552', '0', 2500, 2155, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-12-26 00:00:00', '', '', '4', '2', '3', NULL, '2026-06-09 10:48:56', '2026-06-09 10:48:56'),
(468, '2026-06-09 17:48:00', '08F38O', '', '2026021400-1', 'IST', '1031ISTC4000030', 'CONN S3B-PH-SM4-TB 3PIN RoHS', 'S3B-PH-SM4-TB (LF)(SN)', 'I50955', '2025.11', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-14 00:00:00', '', '', '4', '3', '1', NULL, '2026-06-09 10:49:26', '2026-06-10 00:23:55'),
(469, '2026-06-09 17:49:00', '08F38L', '', '2026021400-1', 'IST', '1031ISTC4000030', 'CONN S3B-PH-SM4-TB 3PIN RoHS', 'S3B-PH-SM4-TB (LF)(SN)', 'I50955', '2025.11', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-14 00:00:00', '', '', '4', '3', '1', NULL, '2026-06-09 10:49:35', '2026-06-09 16:10:41'),
(470, '2026-06-09 17:49:00', '08F38N', '', '2026021400-1', 'IST', '1031ISTC4000030', 'CONN S3B-PH-SM4-TB 3PIN RoHS', 'S3B-PH-SM4-TB (LF)(SN)', 'I50955', '2025.11', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-14 00:00:00', '', '', '4', '3', '1', NULL, '2026-06-09 10:49:43', '2026-06-09 16:10:38'),
(471, '2026-06-09 17:49:00', '08F38P', '', '2026021400-1', 'IST', '1031ISTC4000030', 'CONN S3B-PH-SM4-TB 3PIN RoHS', 'S3B-PH-SM4-TB (LF)(SN)', 'I50955', '2025.11', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-03-14 00:00:00', '', '', '4', '3', '1', NULL, '2026-06-09 10:49:52', '2026-06-09 16:10:34'),
(472, '2026-06-09 17:49:00', '08FVSP', '', '2026022600-1', 'IST', '1031ISTC4000029', 'CONN  S2B-PH-SM4-TB 2pin  RoHS', 'S2B-PH-SM4TB(LF)(SN)', 'I50932', '2025', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-02-28 00:00:00', '', '', '4', '3', '2', NULL, '2026-06-09 10:50:13', '2026-06-10 00:23:58'),
(473, '2026-06-09 17:50:00', '08FVSM', '', '2026022600-1', 'IST', '1031ISTC4000029', 'CONN  S2B-PH-SM4-TB 2pin  RoHS', 'S2B-PH-SM4TB(LF)(SN)', 'I50932', '2025', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-02-28 00:00:00', '', '', '4', '3', '2', NULL, '2026-06-09 10:50:21', '2026-06-09 16:10:27'),
(474, '2026-06-09 17:50:00', '08FVVH', '', '2026022600-1', 'IST', '1031ISTC4000029', 'CONN  S2B-PH-SM4-TB 2pin  RoHS', 'S2B-PH-SM4TB(LF)(SN)', 'I50395', '2025', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-02-28 00:00:00', '', '', '4', '3', '2', NULL, '2026-06-09 10:50:35', '2026-06-09 16:10:23'),
(475, '2026-06-09 17:50:00', '08FVW5', '', '2026022600-1', 'IST', '1031ISTC4000029', 'CONN  S2B-PH-SM4-TB 2pin  RoHS', 'S2B-PH-SM4TB(LF)(SN)', 'I50931', '2025', '0', 1000, 0, 8251, 'SS12 - ISTA Kitting Store SMT', 'Withdrawn', '2027-02-28 00:00:00', '', '', '4', '3', '2', NULL, '2026-06-09 10:50:45', '2026-06-09 16:10:19'),
(476, '2026-06-09 17:50:00', '08K3XO', '', '2026042100-1', 'IST', '1061ISTD4000024', 'DIODE SMD  VEMD2020X01 ROHS', 'VEMD2020X01', 'SG0037H.04/1926076C05', '2607', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-02-13 00:00:00', '', '', '5', '1', '1', NULL, '2026-06-09 10:51:15', '2026-06-09 10:51:15'),
(477, '2026-06-09 17:51:00', '08K3XW', '', '2026042100-1', 'IST', '1061ISTD4000023', 'DIODE SMD  VSMB2020X01 RoHS', 'VSMB2020X01', 'SF00U5V.05/1126023B01', '2602', '0', 6000, 6000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-12-19 00:00:00', '', '', '5', '1', '2', NULL, '2026-06-09 10:51:24', '2026-06-09 10:51:24'),
(478, '2026-06-09 17:51:00', '08I3I5', '', '2026032400-1', 'IST', '1041ISTE2002001', 'E-cap 2200uF 6.3V,10x10,2mm RoHS', 'EEE-FT0J222AP', '', '2519', '0', 500, 181, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-21 00:00:00', '', '', '5', '2', '2', NULL, '2026-06-09 10:51:42', '2026-06-09 10:51:42'),
(479, '2026-06-09 17:51:00', '08EEHM', '', '2026020500-1', 'IST', '8031ISTC4000074', 'CONN  FLE-109-01-G-DV-K RoHS', 'FLE-109-01-G-DV-K-FR', '', '2603', '0', 975, 750, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '5', '3', '1', NULL, '2026-06-09 10:52:06', '2026-06-09 10:52:06'),
(480, '2026-06-09 17:52:00', '08EEHJ', '', '2026020500-1', 'IST', '8031ISTC4000074', 'CONN  FLE-109-01-G-DV-K RoHS', 'FLE-109-01-G-DV-K-FR', '', '2603', '0', 975, 975, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '5', '3', '1', NULL, '2026-06-09 10:52:15', '2026-06-09 10:52:15'),
(481, '2026-06-09 17:52:00', '08EEH9', '', '2026020500-1', 'IST', '8031ISTC4000074', 'CONN  FLE-109-01-G-DV-K RoHS', 'FLE-109-01-G-DV-K-FR', '', '2603', '0', 975, 975, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '5', '3', '1', NULL, '2026-06-09 10:52:24', '2026-06-09 10:52:24'),
(482, '2026-06-09 17:52:00', '08EEH7', '', '2026020500-1', 'IST', '8031ISTC4000074', 'CONN  FLE-109-01-G-DV-K RoHS', 'FLE-109-01-G-DV-K-FR', '', '2603', '0', 975, 975, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2028-01-16 00:00:00', '', '', '5', '3', '1', NULL, '2026-06-09 10:52:32', '2026-06-09 10:52:32'),
(483, '2026-06-09 17:52:00', '08DUGP', '', '2026011600-1', 'IST', '8031ISTC4000075', 'CONN FW-09-03-G-D-215-150-P-TR RoHS', 'FW-09-03-G-D-215-150-P-TR', '', '2548', '0', 300, 153, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '5', '3', '2', NULL, '2026-06-09 10:52:49', '2026-06-09 10:52:49'),
(484, '2026-06-09 17:52:00', '08DUGR', '', '2026011600-1', 'IST', '8031ISTC4000075', 'CONN FW-09-03-G-D-215-150-P-TR RoHS', 'FW-09-03-G-D-215-150-P-TR', '', '2548', '0', 300, 300, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '5', '3', '2', NULL, '2026-06-09 10:53:13', '2026-06-09 10:53:13'),
(485, '2026-06-09 17:53:00', '08DUGQ', '', '2026011600-1', 'IST', '8031ISTC4000075', 'CONN FW-09-03-G-D-215-150-P-TR RoHS', 'FW-09-03-G-D-215-150-P-TR', '', '2548', '0', 300, 300, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-11-28 00:00:00', '', '', '5', '3', '2', NULL, '2026-06-09 10:53:21', '2026-06-09 10:53:21'),
(486, '2026-06-09 17:53:00', '084DGW', '', '2025082900-1', 'IST', '8041ISTC4000051', 'C-CAP  2.2nF 50V +/-10% X7R 0402 RoHS', 'GRM155R71H222KA01D', 'IA5724CL6', '2534', '0', 10000, 10000, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2027-08-22 00:00:00', '', '', '3', '3', '2', NULL, '2026-06-09 10:53:51', '2026-06-09 10:53:51'),
(487, '2026-01-18 00:00:00', '08COSP', '0017468155', '2026011301-1', 'IST', '8021ISTIC400002', 'IC  CC1201RHB ROHS:', 'CC1201RHBR', '6798925ZFK', '2550', '0', 3000, 3000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-12-12 00:00:00', '', '', '4', '1', '2', NULL, '2026-06-09 10:54:54', '2026-06-09 10:54:54'),
(488, '2026-01-30 00:00:00', '08DPR2', '0017468155', '2026012900-1', 'IST', '8021ISTIC400001', 'IC  ADS1220IRVA TI ROHS:', 'ADS1220IRVAR', '3561876ZGT', '2547', '0', 3000, 3000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-11-21 00:00:00', '', '', '4', '1', '1', NULL, '2026-06-09 10:55:26', '2026-06-09 10:55:26'),
(489, '2026-01-06 00:00:00', '08BRC5', '0017468155', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK5TX', '2547', '0', 500, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 10:55:40', '2026-06-09 16:08:31'),
(490, '2026-01-06 00:00:00', '08BRC6', '0017468155', '2025121706-1', 'IST', '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', '10TLV1000M10X10.5', '3YK5TX', '2547', '0', 500, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2027-11-28 00:00:00', '', '', '1', '2', '3', NULL, '2026-06-09 10:55:54', '2026-06-09 16:08:25'),
(491, '2026-06-09 12:57:00', '08BXCF', '', '2026010600-1', 'IST', '8011ISTP70202SN', 'PCB, FR4, PCB70202 Shennan', 'PCB70202_PCB70252', '2026010600', '4625', '0', 1440, 396, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-06-13 00:00:00', '', 'Rack 4 L4 Box 1 Slot 1', '4', '4', '1', NULL, '2026-06-09 10:57:37', '2026-06-11 01:37:28'),
(492, '2026-06-09 12:57:00', '08AM1L', '', '2025080800-1', 'IST', '8011ISTP50305SN', 'PCB 50305,50355 4x3 UNITS, FR4,RoHS (SN)', '101493770', '2025080800', '2425', '0', 576, 36, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-05-30 00:00:00', '', 'Rack 5 L4 Box 1 Slot 1', '5', '4', '1', NULL, '2026-06-09 10:57:50', '2026-06-11 01:37:28'),
(493, '2026-06-09 12:57:00', '08AM1T', '', '2025080800-1', 'IST', '8011ISTP50305SN', 'PCB 50305,50355 4x3 UNITS, FR4,RoHS (SN)', '101493770', '2025080800', '2225', '0', 480, 480, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-05-30 00:00:00', '', 'Rack 5 L4 Box 1 Slot 1', '5', '4', '1', NULL, '2026-06-09 10:58:01', '2026-06-11 01:37:28'),
(494, '2026-06-09 12:58:00', '08I3TZ', '', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4825', '0', 1440, 1440, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-09 10:58:14', '2026-06-09 10:58:14'),
(495, '2026-06-09 12:58:00', '08J5UU', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '3625', '0', 480, 480, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:58:31', '2026-06-09 10:58:31'),
(496, '2026-06-09 12:58:00', '08J6BE', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '3625', '0', 288, 288, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:58:40', '2026-06-09 10:58:40'),
(497, '2026-06-09 12:58:00', '08J5WX', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '5025', '0', 540, 540, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:58:53', '2026-06-09 10:58:53'),
(498, '2026-06-09 12:58:00', '08J5UX', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '3625', '0', 522, 522, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:59:05', '2026-06-09 10:59:05'),
(499, '2026-06-09 12:59:00', '08J5WY', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '5025', '0', 540, 540, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:59:14', '2026-06-09 10:59:14'),
(500, '2026-06-09 12:59:00', '08J5UY', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '3625', '0', 477, 477, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:59:23', '2026-06-09 10:59:23'),
(501, '2026-06-09 12:59:00', '08J5X4', '', '2026032500-1', 'IST', '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', 'PCB42208_PCB42108,101486033', '', '5025', '0', 540, 540, 8251, 'SS12 - ISTA Kitting Store SMT', 'Restricted', '2026-09-05 00:00:00', '', '', '2', '5', '1', NULL, '2026-06-09 10:59:30', '2026-06-09 10:59:30'),
(502, '2026-02-03 00:00:00', '08E1OP', '0017508305', '2026012100-1', 'IST', '1051ISTC2M2F100', 'C-RES 2.2 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-072M2L', '38O47711930135', '2552', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-12-31 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-09 13:14:23', '2026-06-09 13:14:23'),
(503, '2026-05-30 00:00:00', '08MCMH', '0017508305', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 13:14:52', '2026-06-09 13:14:52'),
(504, '2026-06-10 07:41:00', '08MCMI', '0017508305', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P0970799', '2618', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-09 13:15:07', '2026-06-10 05:31:21'),
(505, '2026-05-16 00:00:00', '08LC9A', '0017508305', '2026051200-1', 'IST', '1051ISTC154F011', 'C-RES 150 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07150KL', '38P0350377', '2616', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-04-02 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-09 13:16:09', '2026-06-10 13:14:34'),
(506, '2026-05-04 00:00:00', '08KDMH', '0017508305', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 2000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-09 13:23:04', '2026-06-09 13:23:04'),
(507, '2026-05-04 00:00:00', '08KDMJ', '0017508305', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-09 13:23:19', '2026-06-10 05:32:16'),
(508, '2025-12-21 00:00:00', '08B94A', '0017508305', '2025121802-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6710611ZFK', '2546', '0', 2000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-09 13:23:41', '2026-06-10 13:10:11'),
(509, '2025-12-21 00:00:00', '08B94B', '0017508305', '2025121802-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6710610ZFK', '2546', '0', 2000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-09 13:23:54', '2026-06-10 05:32:14'),
(510, '2026-04-01 00:00:00', '08I3U6', '0017508305', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-09 13:24:34', '2026-06-09 13:24:34'),
(511, '2026-04-01 00:00:00', '08I3XA', '0017508305', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-09 13:24:45', '2026-06-09 13:24:45'),
(512, '2026-04-01 00:00:00', '08I3UF', '0017508305', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-09 13:24:56', '2026-06-09 13:24:56'),
(513, '2026-02-03 00:00:00', '08E0KC', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-5SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:51:25', '2026-06-09 13:51:25'),
(514, '2026-02-03 00:00:00', '08E0KD', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-5SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:51:39', '2026-06-09 13:51:39'),
(515, '2026-02-03 00:00:00', '08E0KE', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-5SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:52:00', '2026-06-09 13:52:00'),
(516, '2026-02-03 00:00:00', '08E0KF', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-5SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:52:19', '2026-06-09 13:52:19'),
(517, '2026-02-03 00:00:00', '08E0KV', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-2SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:52:36', '2026-06-09 13:52:36'),
(518, '2026-02-03 00:00:00', '08E0KG', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-5SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:54:08', '2026-06-09 13:54:08'),
(519, '2026-02-03 00:00:00', '08E0JR', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:55:37', '2026-06-09 13:55:37'),
(520, '2026-02-03 00:00:00', '08E0JP', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:56:06', '2026-06-09 13:56:06'),
(521, '2026-02-03 00:00:00', '08E0J1', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:56:19', '2026-06-09 13:56:19'),
(522, '2026-02-03 00:00:00', '08E0J2', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:56:35', '2026-06-09 13:56:35'),
(523, '2026-02-03 00:00:00', '08E0IY', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:56:59', '2026-06-09 13:56:59'),
(524, '2026-02-03 00:00:00', '08E0IZ', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:57:13', '2026-06-09 13:57:13'),
(525, '2026-02-03 00:00:00', '08E0J0', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-4SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:57:26', '2026-06-09 13:57:26'),
(526, '2026-02-03 00:00:00', '08E0JZ', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:57:38', '2026-06-09 13:57:38'),
(527, '2026-02-03 00:00:00', '08E0K0', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:57:50', '2026-06-09 13:57:50'),
(528, '2026-02-03 00:00:00', '08E0K1', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:59:08', '2026-06-09 13:59:08'),
(529, '2026-02-03 00:00:00', '08E0KR', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-2SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:59:20', '2026-06-09 13:59:20'),
(530, '2026-02-03 00:00:00', '08E0KS', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-2SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:59:32', '2026-06-09 13:59:32'),
(531, '2026-02-03 00:00:00', '08E0KT', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-2SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 13:59:46', '2026-06-09 13:59:46'),
(532, '2026-02-03 00:00:00', '08E0KU', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-2SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:00:01', '2026-06-09 14:00:01'),
(533, '2026-02-03 00:00:00', '08E0JQ', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:00:15', '2026-06-09 14:00:15'),
(534, '2026-02-03 00:00:00', '08E0JO', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:00:28', '2026-06-09 14:00:28'),
(535, '2026-02-03 00:00:00', '08E0JN', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:00:44', '2026-06-09 14:00:44'),
(536, '2026-02-03 00:00:00', '08E0JX', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:00:56', '2026-06-09 14:00:56'),
(537, '2026-02-03 00:00:00', '08E0JY', '0017508317', '2026012100-1', 'IST', '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', '104KT1608TAA-512135', '251010-04-0347-3SNDMF', '251010', '0', 4000, 4000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-10-10 00:00:00', '', '', '2', '3', '1', NULL, '2026-06-09 14:01:08', '2026-06-09 14:01:08'),
(538, '2026-05-30 00:00:00', '08MCIJ', '0017508341', '2026050600-1', 'IST', '1061ISTD2000449', 'ESD protection diode', 'ESD5Z7.0T1G', 'MQU120142', '2612', '0', 3000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '3', NULL, '2026-06-09 14:02:13', '2026-06-09 14:02:24'),
(544, '2026-06-10 05:18:00', '847126241013', '', '2026022400-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '40.25', '0', 1440, 1440, 8471, 'ISTA Split and Splice(SMT)', 'Restricted', '2026-09-05 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 03:18:38', '2026-06-10 03:18:38'),
(551, '2026-01-14 00:00:00', '08CBTV', '0017508762', '2025122400-1', 'IST', '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07100KL', '38O3011103', '2531', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-07-18 00:00:00', '', '', '2', '2', '1', NULL, '2026-06-10 04:04:11', '2026-06-10 04:04:11'),
(553, '2026-06-10 06:08:00', '08KDK8', '0017508708', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 2000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-10 04:07:30', '2026-06-10 04:08:14'),
(555, '2026-06-10 06:08:00', '08KDK7', '', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-10 04:08:22', '2026-06-10 13:17:50'),
(556, '2026-06-10 06:08:00', '08KDK0', '', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-10 04:08:31', '2026-06-10 13:17:40'),
(557, '2026-06-10 06:08:00', '08KDJX', '', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-10 04:08:46', '2026-06-11 00:57:40'),
(558, '2026-06-10 06:08:00', '08KDJY', '', '2026042900-1', 'IST', '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', 'LS T676-R1S1-1-0-20-R18-Z', 'TEJ1205A99', '2612', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2028-03-19 00:00:00', '', '', '2', '4', '1', NULL, '2026-06-10 04:08:56', '2026-06-11 00:57:35'),
(559, '2026-06-11 02:58:00', '08D3AD', '', '2026010900-1', 'IST', '8041ISTC221K161', 'C-CAP 220pF 16V +/-10% COG 0402 RoHS', 'GRM1555C1H221JA01D', 'IA5O17U85', '2552', '0', 10000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2027-12-26 00:00:00', '', '', '3', '4', '3', NULL, '2026-06-10 04:09:23', '2026-06-11 01:04:04'),
(560, '2026-06-10 06:09:00', '08DNS9', '', '2026011400-1', 'IST', '1051ISTC563F100', 'C-RES 56 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0756KL', '38O45510690078', '2550', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-10 04:09:43', '2026-06-10 04:09:43'),
(561, '2026-06-10 06:09:00', '08E1ON', '', '2026012100-1', 'IST', '1051ISTC2M2F100', 'C-RES 2.2 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-072M2L', '38O47711930139', '2552', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2027-12-31 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-10 04:10:03', '2026-06-10 04:10:03'),
(562, '2026-06-10 06:10:00', '08DNSA', '', '2026011400-1', 'IST', '1051ISTC563F100', 'C-RES 56 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0756KL', '38O45510690079', '2550', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-10 04:10:23', '2026-06-10 04:10:23'),
(563, '2026-06-10 06:10:00', '08E1OO', '', '2026012100-1', 'IST', '1051ISTC2M2F100', 'C-RES 2.2 MOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-072M2L', '38O47711930140', '2552', '0', 10000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2027-12-31 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-10 04:10:41', '2026-06-10 13:12:57'),
(564, '2026-06-10 06:10:00', '08MCME', '', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-10 04:11:01', '2026-06-10 13:20:10'),
(565, '2026-06-10 06:11:00', '08MCMD', '', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-10 04:11:21', '2026-06-10 04:11:21'),
(566, '2026-06-10 06:11:00', '08LC98', '', '2026051200-1', 'IST', '1051ISTC154F011', 'C-RES 150 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07150KL', '38P0350377', '2616', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2028-04-02 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-10 04:11:35', '2026-06-10 04:11:35'),
(567, '2026-06-10 06:11:00', '08LC99', '', '2026051200-1', 'IST', '1051ISTC154F011', 'C-RES 150 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-07150KL', '38P0350377', '2616', '0', 10000, 10000, 8270, 'Out From Store Plant 3', 'Restricted', '2028-04-02 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-10 04:11:44', '2026-06-10 04:11:44'),
(568, '2026-06-10 06:11:00', '08B948', '', '2025121802-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6707590ZFK', '2545', '0', 2000, 2000, 8270, 'Out From Store Plant 3', 'Restricted', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-10 04:13:16', '2026-06-10 04:13:16'),
(569, '2026-06-10 06:13:00', '08B94C', '', '2025121802-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6710033ZFK', '2546', '0', 2000, 2000, 8270, 'Out From Store Plant 3', 'Restricted', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-10 04:13:25', '2026-06-10 04:13:25'),
(570, '2026-06-11 02:59:00', '08B95R', '', '2025121803-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6715072ZFK', '2546', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-10 04:13:32', '2026-06-11 01:04:25'),
(571, '2026-06-11 02:59:00', '08B95S', '', '2025121803-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6715071ZFK', '2546', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-10 04:13:41', '2026-06-11 01:04:21'),
(572, '2026-06-10 06:13:00', '08B95Z', '', '2025121803-1', 'IST', '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', 'CC430F6147IRGCR', '6718782ZFK', '2547', '0', 2000, 0, 8270, 'Out From Store Plant 3', 'Withdrawn', '2026-11-14 00:00:00', '', '', '2', '1', '1', NULL, '2026-06-10 04:13:50', '2026-06-10 13:17:02'),
(573, '2026-04-01 00:00:00', '08I3U8', '0017508709', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 04:17:56', '2026-06-10 04:17:56'),
(574, '2026-04-01 00:00:00', '08I3UH', '0017508709', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 04:18:10', '2026-06-10 04:18:10'),
(575, '2026-04-01 00:00:00', '08I3UG', '0017508709', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 04:18:23', '2026-06-10 04:18:23'),
(577, '2026-02-01 00:00:00', '08DVUO', '0017508753', '2026012700-1', 'IST', '1051ISTC473F001', 'C-RES 47 kOhm +/-1% 1/16W 0402 RoHS', 'RC0402FR-0747KL', '38O42100940205', '2546', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-11-14 00:00:00', '', '', '2', '2', '2', NULL, '2026-06-10 10:31:36', '2026-06-10 10:31:36'),
(578, '2026-03-17 00:00:00', '08H8TO', '0017508753', '2026021800-1', 'IST', '1161ISTS2000322', 'SWITCH 999-52722-4.8x4.5x0.55-Ag-TR', 'TP-1198-L00316', '', '190126', '0', 5000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-01-19 00:00:00', '', '', '3', '1', '2', NULL, '2026-06-10 10:31:48', '2026-06-10 13:19:02'),
(579, '2026-04-01 00:00:00', '08I3TL', '0017509854', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4825', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 13:45:24', '2026-06-10 13:45:24'),
(580, '2026-04-01 00:00:00', '08I3U9', '0017509854', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-10 13:45:35', '2026-06-10 13:45:35'),
(581, '2026-05-30 00:00:00', '08MCMG', '0017509854', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-10 13:45:46', '2026-06-11 00:54:07'),
(582, '2026-04-21 00:00:00', '08J9A6', '0017509854', '2026041800-1', 'IST', '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-07330RL', '38P1110247', '2613', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-03-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-10 13:45:59', '2026-06-11 00:53:00'),
(583, '2026-05-30 00:00:00', '08MCMF', '0017509854', '2026052800-1', 'IST', '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', 'RC0402FR-07180RL', '38P1061026', '2618', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-04-30 00:00:00', '', '', '3', '2', '1', NULL, '2026-06-10 13:46:25', '2026-06-10 16:23:20'),
(584, '2026-05-05 00:00:00', '08KG86', '0017509854', '2026042900-1', 'IST', '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', 'RC0402JR-07330RL', '38P05209840135', '2613', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2028-03-26 00:00:00', '', '', '3', '2', '2', NULL, '2026-06-10 13:46:37', '2026-06-10 13:46:37'),
(585, '2026-06-10 00:00:00', '08N254', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850055', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:47:07', '2026-06-10 13:47:07'),
(586, '2026-06-10 00:00:00', '08N253', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850072', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:47:18', '2026-06-10 13:47:18'),
(587, '2026-06-10 00:00:00', '08N251', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850071', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:47:32', '2026-06-10 13:47:32'),
(588, '2026-06-10 00:00:00', '08N252', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850070', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:47:43', '2026-06-10 13:47:43'),
(589, '2026-06-10 00:00:00', '08N250', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850069', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:47:56', '2026-06-10 13:47:56'),
(590, '2026-06-10 00:00:00', '08N24W', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850068', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:48:08', '2026-06-10 13:48:08'),
(591, '2026-06-10 00:00:00', '08N24V', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850067', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:48:20', '2026-06-10 13:48:20');
INSERT INTO `inventory_receive` (`id`, `ReceiveDate`, `PUID`, `ReservationNo`, `IM`, `Customer`, `HanaPart`, `Description`, `MnfPartNo`, `LotNo`, `DateCode`, `BinSize`, `Qty`, `QtyRemain`, `McID`, `MachineName`, `StatusName`, `ExpirationDate`, `OldIM`, `Remark`, `Loc_Shelf`, `Loc_Level`, `Loc_Box`, `ExpireDate_RoomTemp`, `created_at`, `updated_at`) VALUES
(592, '2026-06-11 03:44:00', '08N24Y', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850066', '2136', '0', 10000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:48:31', '2026-06-11 03:16:15'),
(593, '2026-06-10 00:00:00', '08N24X', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850065', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:49:05', '2026-06-10 13:49:05'),
(594, '2026-06-10 00:00:00', '08N24Z', '0017509856', '2022041203-1', 'IST', '1051ISTR6000204', 'RES; SMD0402; 10M?; ±5%; 1/16W; 200ppm', 'RC0402JR-0710ML', '50K34674850064', '2136', '0', 10000, 10000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-07-10 00:00:00', '', '', '3', '4', '2', NULL, '2026-06-10 13:49:24', '2026-06-10 13:49:24'),
(595, '2026-05-08 00:00:00', '08KNI2', '0017510303', '2026050600-1', 'COM', '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', 'Sn96.5Ag3Cu0.5/INDIUM8.9HF/TYPE4/88.5%', 'PMA5673', '', '0', 500, 0, 8200, 'Out From Store Plant 1                                                                                                          ', 'Withdrawn', '2027-03-11 00:00:00', '', '', '1', '3', '1', NULL, '2026-06-10 16:26:21', '2026-06-11 01:05:19'),
(596, '2026-05-08 00:00:00', '08KNIH', '0017510303', '2026050600-1', 'COM', '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', 'Sn96.5Ag3Cu0.5/INDIUM8.9HF/TYPE4/88.5%', 'PMA5673', '', '0', 500, 500, 8200, 'Out From Store Plant 1                                                                                                          ', 'Restricted', '2027-03-11 00:00:00', '', '', '1', '3', '1', NULL, '2026-06-10 16:26:44', '2026-06-10 16:26:44'),
(603, '2026-01-23 00:00:00', '08D5LI', '0017510512', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5N19A08', '2552', '0', 3000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-11 03:27:55', '2026-06-11 03:31:09'),
(604, '2026-01-23 00:00:00', '08D5LJ', '0017510512', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5N19A08', '2552', '0', 3000, 3000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-11 03:28:08', '2026-06-11 03:28:08'),
(605, '2026-01-23 00:00:00', '08D5K2', '0017510512', '2026010900-1', 'IST', '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', 'GRM21BR71A225KA01L', 'IA5N19A08', '2552', '0', 3000, 3000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-12-26 00:00:00', '', '', '2', '3', '2', NULL, '2026-06-11 03:28:19', '2026-06-11 03:28:19'),
(606, '2026-01-27 00:00:00', '08DHH3', '0017510512', '2026011300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00SA7.02/1125484C06', '2548', '0', 6000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2027-11-28 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-11 03:29:10', '2026-06-11 04:29:49'),
(607, '2026-01-27 00:00:00', '08DHH0', '0017510512', '2026011300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00S9E.02/1125483C07', '2548', '0', 6000, 6000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-11-28 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-11 03:29:23', '2026-06-11 03:29:23'),
(608, '2026-01-27 00:00:00', '08DHGW', '0017510512', '2026011300-1', 'IST', '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', 'VSMB2000X01', 'SF00SHU.06/1125485C03', '2548', '0', 6000, 6000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2027-11-28 00:00:00', '', '', '2', '1', '2', NULL, '2026-06-11 03:29:36', '2026-06-11 03:29:36'),
(609, '2026-04-28 00:00:00', '08JW2K', '0017510512', '2026033100-1', 'IST', '1161ISTS2000322', 'SWITCH 999-52722-4.8x4.5x0.55-Ag-TR', 'TP-1198-L00316', '', '020326', '0', 5000, 5000, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2028-03-01 00:00:00', '', '', '3', '1', '2', NULL, '2026-06-11 03:30:07', '2026-06-11 03:30:07'),
(610, '2026-03-17 00:00:00', '08H8TV', '0017510512', '2026021800-1', 'IST', '1161ISTS2000322', 'SWITCH 999-52722-4.8x4.5x0.55-Ag-TR', 'TP-1198-L00316', '', '190126', '0', 5000, 0, 8270, 'Out From Store Plant 3                                                                                                          ', 'Withdrawn', '2028-01-19 00:00:00', '', '', '3', '1', '2', NULL, '2026-06-11 03:30:20', '2026-06-11 03:31:52'),
(611, '2026-04-01 00:00:00', '08I3V3', '0017510512', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-11 03:30:39', '2026-06-11 03:30:39'),
(612, '2026-04-01 00:00:00', '08I3XC', '0017510512', '2026032500-1', 'IST', '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', '101255568', '', '4425', '0', 1440, 1440, 8270, 'Out From Store Plant 3                                                                                                          ', 'Restricted', '2026-10-31 00:00:00', '', '', '5', '4', '2', NULL, '2026-06-11 03:30:51', '2026-06-11 03:30:51'),
(613, '2026-06-11 06:32:00', '08AQAV', '', '2025120400-1', 'IST', '8011ISTP50305SN', 'PCB 50305,50355 4x3 UNITS, FR4,RoHS (SN)', '101493770', '', '3625', '0', 1440, 0, 8581, 'SS12 - Material Issue Out', 'Withdrawn', '2026-09-05 00:00:00', '', '', '5', '4', '1', NULL, '2026-06-11 04:32:21', '2026-06-11 04:40:42');

-- --------------------------------------------------------

--
-- Table structure for table `levels`
--

CREATE TABLE `levels` (
  `id` int(11) NOT NULL COMMENT 'รหัสชั้น (PK)',
  `rack_id` int(11) DEFAULT NULL COMMENT 'รหัสตู้ที่อยู่ (FK -> racks)',
  `level_no` int(11) DEFAULT NULL COMMENT 'หมายเลขชั้น (1=ล่างสุด)',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ชั้นวาง (Level) - ชั้นแต่ละชั้นบนตู้/ชั้นวาง';

--
-- Dumping data for table `levels`
--

INSERT INTO `levels` (`id`, `rack_id`, `level_no`, `remark`) VALUES
(1, 1, 1, NULL),
(2, 1, 2, NULL),
(3, 1, 3, NULL),
(4, 1, 4, NULL),
(5, 7, 1, NULL),
(6, 7, 2, NULL),
(7, 7, 3, NULL),
(8, 7, 4, NULL),
(9, 1, 5, NULL),
(10, 2, 1, NULL),
(11, 2, 2, NULL),
(12, 2, 3, NULL),
(13, 2, 4, NULL),
(14, 2, 5, NULL),
(15, 3, 1, NULL),
(16, 3, 2, NULL),
(17, 3, 3, NULL),
(18, 3, 4, NULL),
(19, 3, 5, NULL),
(20, 5, 1, NULL),
(21, 5, 2, NULL),
(22, 5, 3, NULL),
(23, 5, 4, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (PK)',
  `material_code` varchar(50) NOT NULL COMMENT 'รหัสวัสดุ (ตรงกับ HanaPart)',
  `description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดวัสดุ',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น สินค้าทดแทน, เลิกใช้แล้ว'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายชื่อวัสดุ (Material Master) - ข้อมูลหลักของวัสดุทั้งหมด';

--
-- Dumping data for table `materials`
--

INSERT INTO `materials` (`id`, `material_code`, `description`, `remark`) VALUES
(1, '1031ISTCON53327', 'PIN CONNECTOR MOLEX 53398-0271', NULL),
(2, '8021ISTPVQFNSOC', 'IC CC430F6147 IRGC,VQFN64,16-BIT RoHS:', NULL),
(3, '1041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', NULL),
(4, '8041ISTC222K251', 'C-CAP 2.2nF 25V +/-10% X7R 0402 RoHS', NULL),
(5, '1031ISTCON3PINX', 'Pinconnector 3 pin', NULL),
(6, '1051ISTNTCTHER0', 'NTC THERMISTOR R25=100K OHM,+/-5%, SOD80', NULL),
(7, '8011ISTP29101AP', 'PCB 29101, 5x2 UNITS, FR4, REV.A ROHS', NULL),
(8, '1201COMSDPAT43R', 'S/P SAC305 INDIUM8.9HF T4 ML88.5 Pb Free', NULL),
(9, '8011ISTP50104AP', 'PCB 50104, 4x3 UNITS, FR4, REV.C ROHS', NULL),
(10, '8011ISTP50104SN', 'PCB 50104, FR4, Rev.C RoHS (Shennan)', NULL),
(13, '1041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', NULL),
(14, '8041ISTC200J001', 'C-CAP 20pF 16V +/-5% COG 0402 RoHS', NULL),
(15, '1041ISTC270G161', 'C-CAP 27 PF,+/-2%,16V COG,0402 RoHS', NULL),
(16, '8041ISTC270G161', 'C-CAP 27pF 16V +/-2% COG 0402 RoHS', NULL),
(17, '1041ISTC1R5B001', 'C-CAP 1.5pF 16V +/- 0.1pF COG 0402 RoHS', NULL),
(18, '8041ISTC1R5B001', 'C-CAP 1.5pF 16V +/- 0.1pF COG 0402 RoHS', NULL),
(19, '1041ISTC101J161', 'C-CAP 100PF 16V +/-5% COG 0402 RoHS', NULL),
(20, '8041ISTC101J161', 'C-CAP 100pF 16V +/-5% COG 0402 RoHS', NULL),
(21, '1041ISTC3R3B501', 'C-CAP 3.3pF, ±0.1pF; 16V; C0G 0402 RoHS', NULL),
(22, '8041ISTC3R3B501', 'C-CAP 3.3pF 16V +/-0.1pF COG 0402 RoHS', NULL),
(23, '1041ISTC224K100', 'CAP2.2UF,6.3V,0805,+/-10%,X5R/X7R RoHS', NULL),
(24, '8041ISTC224K100', 'C-CAP 2.2uF 6.3V +/-10% X5R 0805 RoHS', NULL),
(25, '1041ISTC3R9B501', 'C-CAP 3.9pF; ±0.1pF; 50V COG 0402 RoHS', NULL),
(26, '8041ISTC3R9B501', 'C-CAP 3.9pF 50V +/-0.1pF COG 0402 RoHS', NULL),
(27, '1041ISTC103J101', 'C-CAP 10nF;±5%; 16V; X7R 0402 RoHS', NULL),
(28, '8041ISTC103J101', 'C-CAP 10nF 10V +/-5% X7R 0402 RoHS', NULL),
(29, '1041ISTC104Z161', 'C-CAP 100nF 16V ±10%; X7R 0402 RoHS', NULL),
(30, '8041ISTC104Z161', 'C-CAP 100nF 10V -20/+80% X7R 0402 RoHS', NULL),
(31, '1041ISTC120G501', 'C-CAP 12pF 16V +/-2% COG 0402 RoHS', NULL),
(32, '8041ISTC120G501', 'C-CAP 12pF 16V +/-2% COG 0402 RoHS', NULL),
(33, '1041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', NULL),
(34, '8041ISTC470M501', 'C-CAP 47pF 25V +/-5% COG 0402 RoHS', NULL),
(35, '1041ISTC154K161', 'C-CAP 150nF,10V,+/-10% X5R 0402 RoHS', NULL),
(36, '8041ISTC154K161', 'C-CAP 150nF 10V +/-10% X7R 0402 RoHS', NULL),
(37, '1051ISTC473F001', 'C-RES 47 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(38, '1051ISTC000J200', 'C-RES 0 Ohm +/-5% 1/10W 0603 RoHS', NULL),
(39, '1051ISTC563F100', 'C-RES 56 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(40, '1051ISTC2000051', 'C-RES 10 OHM +/-1% 1/16W 0402 RoHS', NULL),
(41, '1051ISTC000F100', 'C-RES 0 Ohm +/-5% 1/16W 0402 RoHS', NULL),
(42, '1051ISTC2M2F100', 'C-RES 2.2 MOhm +/-1% 1/16W 0402 RoHS', NULL),
(43, '1051ISTC393F200', 'C-RES 39kOhm +/-1% 1/16W 50PPM 0603 RoHS', NULL),
(44, '1051ISTC223F200', 'C-RES 22kOhm +/-1% 1/16W 50PPM 0603 RoHS', NULL),
(45, '1091ISTC82NH040', 'C-IND 8.2nH +/-5% 0402 RoHS', NULL),
(46, '1091ISTC10NH040', 'C-IND 10nH +/-5% 0402 RoHS', NULL),
(47, '1091ISTI2000323', 'C-IND 9.5nH +/-2% 0402 RoHS', NULL),
(48, '1091ISTI2000314', 'C-IND 3.3nH +/0.3nH 0402 RoHS', NULL),
(49, '1091ISTLEMC3225', 'INDUCTOR B82422-A1103-K100,10UH,+/-10%', NULL),
(51, '1081ISTC2002303', 'X-TAL 26.0064 MHZ SMD', NULL),
(52, '8011ISTP51107AP', 'PCB 51107, 3x4 UNITS, FR4, REV.A RoHS', NULL),
(53, '8011ISTP51107SN', 'PCB 51107,FR4, Rev.A RoHS (Shennan)', NULL),
(63, '8041ISTC221K161', 'C-CAP 220pF 16V +/-10% COG 0402 RoHS', NULL),
(73, '1051ISTC154F011', 'C-RES 150 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(74, '1051ISTC184F011', 'C-RES 180 Ohm,+/-1%,0402,1/16W RoHS', NULL),
(75, '1051ISTC331J001', 'C-RES 330 Ohm +/-5% 1/16W 0402 RoHS', NULL),
(76, '1051ISTC104F011', 'C-RES 100 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(80, '1091ISTI2000334', 'C-IND 3.3nH +/-2% 0402 RoHS', NULL),
(81, '1061ISTD2000320', 'PIN PHOTODIODE VEMD2000X01', NULL),
(83, '1121ISTL2000321', 'INFRARED EMITTER VSMB2000X01', NULL),
(84, '1121ISTLEDLST67', 'LED RED P/N LST676-R1S1-1-Z RoHS', NULL),
(85, '1161ISTS2000322', 'SWITCH 999-52722-4.8x4.5x0.55-Ag-TR', NULL),
(86, '8011ISTP42108SN', 'PCB42108, 3x3Units, FR4, Shennen', NULL),
(87, '8141ISTFLX50401', 'FLEX PCB 50401, 1x28 UNITS, New Rev.06', NULL),
(88, '1051ISTNTCTHER3', 'NTC THER,R25=100 KOHM 3% 0603,SEMITECH', NULL),
(90, '8011ISTP50305SN', 'PCB 50305,50355 4x3 UNITS, FR4,RoHS (SN)', NULL),
(91, '8021ISTI2000469', 'IC VQFN48, TI CC1310F128RGZR', NULL),
(92, '8011ISTP50305AP', 'PCB 50305, 4x3 UNITS, FR4, RoHS(APCB)', NULL),
(96, '1051ISTR6000211', 'RES; SMD0402; 4.7kΩ; ±1%; 1/16W; 100ppm', NULL),
(98, '1051ISTR6000202', 'RES; SMD0402; 66.5kΩ; ±1%; 1/16W; 100ppm', NULL),
(99, '1051ISTR6000201', 'RES; SMD0402; 200kΩ; ±1%; 1/16W; 100ppm', NULL),
(100, '1051ISTR6000203', 'RES; SMD0402; 33.2kΩ; ±1%; 1/16W; 100ppm', NULL),
(101, '1051ISTR6000204', 'RES; SMD0402; 10MΩ; ±5%; 1/16W; 200ppm', NULL),
(105, '8041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG', NULL),
(106, '8041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', NULL),
(108, '8041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', NULL),
(109, '8041ISTC6000190', 'CAP; SMD0402; 3pF; ±0.25pF; 50V; COG', NULL),
(110, '1041ISTC6000190', 'CAP; SMD0402; 3pF; ±0.25pF; 50V; COG', NULL),
(111, '8041ISTC6000191', 'CAP; SMD0402; 2.2µF; ±10%; 6.3V; X5R', NULL),
(112, '8041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', NULL),
(113, '1041ISTC6000192', 'CAP; SMD0402; 6.2pF; ±0.25pF; 50V; COG', NULL),
(115, '8041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', NULL),
(116, '8041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', NULL),
(117, '1081ISTC6000195', 'Crystal; 3215; 32768Hz, ±20ppm, CL=7pF', NULL),
(118, '1081ISTC6000196', 'Crystals 24MHz 10ppm 9pF-40C +85C', NULL),
(119, '8091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', NULL),
(120, '8091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', NULL),
(121, '1091ISTI6000198', 'IND; SMD0402; 7.5nH; ±5%', NULL),
(123, '1091ISTI6000199', 'IND; SMD0603; 10µH; ±20%; 300mA; 0.6Ω', NULL),
(124, '8091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', NULL),
(125, '1091ISTI6000200', 'IND; SMD0402; 27nH; ±5%', NULL),
(127, '1041ISTC6000333', 'CAP; SMD0402; 100pF; ±5%; 50V; C0G RoHS', NULL),
(128, '8061ISTD6000401', 'ESD protection diode', NULL),
(129, '1061ISTD6000401', 'ESD protection diode ESD321DPYR', NULL),
(130, '1051ISTC102K100', 'C-RES,1KOHM,+/-10% 0402,063W RoHS', NULL),
(131, '8011ISTPCB70202', 'PCB, FR4, PCB70202', NULL),
(132, '8011ISTP70202SN', 'PCB, FR4, PCB70202 Shennan', NULL),
(135, '1041ISTC6000189', 'CAP; SMD0402; 2.7pF; ±0.25pF; 50V; COG', NULL),
(141, '1041ISTC6000193', 'CAP; SMD0603; 22µF; ±20%; 6.3V; X5R', NULL),
(143, '1041ISTC6000194', 'CAP; SMD0402; 1µF; ±10%; 16V; X5R', NULL),
(145, '1041ISTE2002001', 'E-cap 2200uF 6.3V,10x10,2mm RoHS', NULL),
(146, '1041ISTC6000188', 'CAP; SMD0402; 3.6pF; ±0.25pF; 50V; COG', NULL),
(152, '1091ISTI6000197', 'IND; SMD0402; 6.8nH; ±5%', NULL),
(156, '1091ISTI6000347', 'IND; SMD0402; 12nH; ±5%', NULL),
(157, '8091ISTI6000347', 'IND; SMD0402; 12nH; ±5%', NULL),
(162, '1051ISTC332F001', 'C-RES 3.3 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(163, '1051ISTC4000020', 'C-RES 1Ohm +/-1% 1/16W 0402 RoHS', NULL),
(164, '1051ISTR2002010', 'RES; SMD0402; 150Kom; ±1%; 1/16W; 100ppm', NULL),
(166, '1051ISTR2002009', 'RES; SMD0402; 220 Ohm; ±1%; 1/16W;100ppm', NULL),
(169, '1051ISTR2002008', 'RES; SMD0402; 300Kohm; ±1%; 1/16W;100ppm', NULL),
(170, '1061ISTD2002012', 'DIODE NEXPERIA BAT54SW RoHS', NULL),
(171, '1131ISTT2002014', 'TRANSISTOR BJT NEXPERIA BC857CW RoHS', NULL),
(172, '1131ISTT2002015', 'TRANSISTOR BJT NEXPERIA BC847CW RoHS', NULL),
(173, '1031ISTC2002016', 'CON,SMT,8pin(2 row*4 pin) -.100\"(2.54mm)', NULL),
(175, '1041ISTC6000187', 'CAP; SMD0402; 12pF; ±2%; 16V; COG RoHS', NULL),
(177, '1203COMDW06MM05', 'SDW 0.6mmNC,PbFree,3Ag/96.5Sn/0.5Cu#3.3%', NULL),
(178, '1201COMSD06MM00', 'SDW 0.6mmNC,PbFree,3Ag/96.5Sn/0.5Cu#2.8%', NULL),
(179, '2540ISTTRULTEGO', 'SHIPPING TRAY ULTEGO APET ANTI 0.8MM', NULL),
(180, '2530ISTBX374627', 'SHIPG BX 37X46X27.2CM A125 A125 5P', NULL),
(181, '2510COMPB0076X8', 'ANTI STATIC ESD 76X89cmX0.22mm 2ply PINK', NULL),
(182, '2580HPUSILICAG2', 'SILICA GEL MIXED 20GM 4WO20L4 500PC BX', NULL),
(183, '2560ISTFOAMISTA', 'PE FOAM 308X470.83MM THICKNESS 1MM ANTI', NULL),
(184, '1081ISTC2000303', 'X-TAL 26MHz,16PF,10ppm,SMD3225 RoHS', NULL),
(185, '8011ISTP42108AP', 'PCB42108, 3x3Units, FR4, Rev.A RoHS', NULL),
(186, '8041ISTC4000050', 'C-CAP  100nF 16V +/-10% X7R 0402 RoHS', NULL),
(187, '8041ISTC4000007', 'C-CAP 22uF 6.3V +/-20% X5R 0805 RoHS', NULL),
(188, '8041ISTC4000051', 'C-CAP  2.2nF 50V +/-10% X7R 0402 RoHS', NULL),
(189, '8041ISTC4000008', 'C-CAP  22pF 50V +/-2% C0G/NP0 0402 RoHS', NULL),
(190, '8041ISTC4000055', 'C-CAP  10nF 25V/50V 10% X7R 0402 RoHS', NULL),
(191, '8041ISTC4000009', 'C-CAP  47nF 25V/50V 10% X7R 0402 RoHS', NULL),
(192, '8041ISTC4000048', 'C-CAP  1.0pF 50V +/-0.05pF C0G 0402 RoHS', NULL),
(193, '8041ISTC4000010', 'C-CAP  220nF 10V/16V 10% X7R 0402 RoHS', NULL),
(194, '8041ISTC4000011', 'C-CAP 15pF 50V +/-2% C0G/NP0 0402 RoHS', NULL),
(195, '8041ISTC4000034', 'C-CAP  12pF 50V +/-2% C0G/NP0 0402 RoHS', NULL),
(196, '8041ISTC150J101', 'C-CAP 15pF 10V +/-5% COG 0402 RoHS', NULL),
(197, '8041ISTC4000012', 'C-CAP  1.5nF 50V +/-5% C0G/NP0 0603 RoHS', NULL),
(198, '8041ISTC4000056', 'C-CAP  3.3pF 50V +/-0,25pF C0G/NP0 0402', NULL),
(199, '8041ISTC4000019', 'C-CAP  3.0pF 50V +/-0,25pF C0G/NP0 0402', NULL),
(200, '8041ISTC4000057', 'C-CAP  2.2pF 50V +/-0,25pF C0G/NP0 0402', NULL),
(201, '8041ISTC1R0B001', 'C-CAP 1pF 50V +/- 0.1pF COG  0402 RoHS', NULL),
(202, '8041ISTC4000058', 'C-CAP  33pF 50V +/-5% C0G/NP0 0402 RoHS', NULL),
(203, '8041ISTC4000059', 'C-CAP  100pF 50V +/-5% C0G/NP0 0402 RoHS', NULL),
(204, '8041ISTC4000035', 'C-CAP  5.6pF 50V +/-0,1pF C0G 0402 RoHS', NULL),
(205, '8021ISTIC400000', 'IC  MSP430FR6989IPZR REV. E TI ROHS:', NULL),
(206, '8021ISTIC400002', 'IC  CC1201RHBR ROHS:', NULL),
(207, '1161ISTF2000249', 'POLY FUSE 2.3Ohm 15V 25A 1206 RoHS', NULL),
(208, '8091ISTC12NHLQW', 'IND MURRATA 12nH 2% LQW15A,0402 RoHS', NULL),
(209, '8091ISTC4000015', 'C-IND  7.5nH +/-2% 0402  RoHS', NULL),
(210, '8091ISTC4000016', 'C-IND  15nH +/-2% 0402  ROHS', NULL),
(211, '8091ISTC4000017', 'C-IND  10nH +/-2% 0402  RoHS', NULL),
(212, '8091ISTC4000018', 'C-IND  18nH +/-2% 0402  RoHS', NULL),
(214, '1051ISTC2000429', 'C-RES 15MOhm +/-5% 1/16W 0805 RoHS', NULL),
(218, '1051ISTC4000021', 'C-RES 150Ohm +/-1% 1/16W 0402 RoHS', NULL),
(219, '1051ISTC4000022', 'C-RES 51Ohm +/-1% 1/16W 0402 RoHS', NULL),
(220, '1051ISTC335F001', 'C-RES 3.3 MOhm +/-1% 1/16W 0402 RoHS', NULL),
(221, '1051ISTC474F001', 'C-RES 470 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(222, '1051ISTC472F001', 'C-RES 4.7 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(226, '1161ISTS4000027', 'SWITCH SMD 6x6mm 7mm RoHS', NULL),
(227, '1061ISTD4000023', 'DIODE SMD  VSMB2020X01 RoHS', NULL),
(228, '1061ISTD4000024', 'DIODE SMD  VEMD2020X01 ROHS', NULL),
(229, '1061ISTD2000449', 'ESD protection diode', NULL),
(230, '1061ISTD4000032', 'DIODE SMD  BSP149 RoHS', NULL),
(231, '1081ISTC4000114', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', NULL),
(232, '1081ISTC4000014', 'X-TAL 2520 40MHZ 10.0PF +/-10PPM RoHS', NULL),
(233, '1081ISTC4000113', 'XTAL 32768HZ 12.5PF SMD 3215', NULL),
(234, '1081ISTC4000013', 'X-TAL 32.768kHZ EPSON FC-135 12.5pF RoHS', NULL),
(235, '1031ISTC4000029', 'CONN  S2B-PH-SM4-TB 2pin  RoHS', NULL),
(236, '8031ISTC4000074', 'CONN  FLE-109-01-G-DV-K RoHS', NULL),
(237, '1041ISTE4000037', 'E-CAP 1000uF 20% 10V SMD (Rubycon)', NULL),
(239, '8011ISTP51204SN', 'PCB, PCB51204 Shannan', NULL),
(241, '1041ISTC221K161', 'C-CAP 220 pF; ±5%; 16V; C0G, 0402 RoHS', NULL),
(243, '1041ISTC6000191', 'CAP; SMD0402; 2.2µF; ±10%; 6.3V; X5R', NULL),
(246, '8011ISTP37301AP', 'PCB 37301, 8x10 UNITS, FR4, REV.B ROHS', NULL),
(247, '1041ISTC224K200', 'CAP2.2UF,6.3V,0603,+/-10%,X5R/X7R RoHS', NULL),
(248, '1051ISTC100K100', 'C-RES 100 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(249, '1051ISTC103K100', 'C-RES 10 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(250, '1051ISTC105G100', 'C-RES 1 MOhm  +/-1% 1/16W 0402 RoHS', NULL),
(251, '1061ISTBAV99000', 'DIODE,SWITCHING,BAV 99,SOT23 RoHS', NULL),
(252, '1131ISTTRAN856X', 'TRANSISTOR BC856 OR BC856B RoHS', NULL),
(253, '8011ISTP37107AP', 'PCB 37107, 4x2 UNITS, FR4, REV.C ROHS', NULL),
(254, '8021ISTF417IPMR', 'MICROCONTROLER,MSP430F417IPM,S-PQFP-G64:', NULL),
(255, '8021ISTPICC1101', 'IC RF-TRANSMITTER CC1101 RTKR RoHS:', NULL),
(256, '1041ISTC100C161', 'C-CAP 10PF, +/-0.50 PF,16V,COG,0402 RoHS', NULL),
(257, '1041ISTC102J161', 'C-CAP,1nF,10%,16V,COG or X7R 0402 RoHS', NULL),
(258, '1041ISTC105Z631', 'C-CAP 1.0UF,+80%/-20%,Y5V,6.3V,0402 RoHS', NULL),
(259, '1041ISTC1R2C161', 'C-CAP 1.2pF 25V +/- 0.25pF COG 0402 RoHS', NULL),
(260, '1041ISTC1R5C161', 'C-CAP 1.5pF 25V +/-0.25pF COG 0402 RoHS', NULL),
(261, '1041ISTC2R2C161', 'C-CAP 2.2PF,+/-0.25 PF,16V,COG,0402 RoHS', NULL),
(262, '1041ISTC3R3C161', 'C-CAP 3.3 PF,+/-0.25PF,16V COG,0402 RoHS', NULL),
(263, '1041ISTC8R2C161', 'C-CAP 8.2 PF,+/-0.25PF,16V,COG,0402 RoHS', NULL),
(264, '1051ISTC103F001', 'C-RES 10 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(265, '1051ISTC120K60R', 'C-RES 120 Ohm +/-10% 1/2W 2010 RoHS', NULL),
(266, '1051ISTC123K100', 'C-RES 12 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(267, '1051ISTC154K100', 'C-RES 150 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(268, '1051ISTC153F001', 'C-RES 15 kOhm +/-1% 1/16W 0402 RoHS', NULL),
(269, '1051ISTC221F100', 'C-RES 220 Ohm +/-2%, 1/16W 0402 RoHS', NULL),
(270, '1051ISTC3K3K100', 'C-RES 3.3 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(271, '1051ISTC4K7K100', 'C-RES 4.7 kOhm +/-10% 1/16W 0402 RoHS', NULL),
(272, '1061ISTBAT754C0', 'DIODE,SCHOTTKY,BAT 754C,SOT-23', NULL),
(273, '1061ISTBZV55C3V', 'DIODE ,BZV55-C3V3,3.3 SOD-80 ROHS', NULL),
(274, '1051ISTJ2000401', '0 Ohm Jumper SOT23 RoHS', NULL),
(275, '1091ISTC12NH040', 'C-IND 12nH +/-5% 0402 RoHS WUERT WE-MK', NULL),
(276, '1091ISTC18NH040', 'C-IND 18nH +/-5% 0402 RoHS WUERT WE-MK', NULL),
(277, '1091ISTC56NH040', 'C-IND 5.6nH +/-0.3nH 0402 RoHS WUERT WE', NULL),
(278, '1091ISTC68NH040', 'C-IND 6.8nH +/-0.3nH 0402 RoHS WUERT', NULL),
(279, '8011ISTP42604SN', 'PCB 42604 Shennan', NULL),
(280, '8011ISTP42604AP', 'PCB 42604 (APCB)', NULL),
(281, '8021ISTI4000046', 'IC MSP430G2553IRHB32 RoHS:', NULL),
(282, '8021ISTI4000043', 'IC NCN5151 RoHS:', NULL),
(283, '1041ISTC4000144', 'C-CAP 220nF 50V +/-10% X7R 0805 RoHS', NULL),
(284, '1041ISTC4000045', 'C-CAP 10uF 10V/16V +/-20% X5R 0603 RoHS', NULL),
(285, '1051ISTC4000049', 'C-RES 220Ohm +/-1% 1/5W 50V 0603 RoHS', NULL),
(286, '1051ISTC2000428', 'C-RES 100Ohm,+/-1%,1/16W,0402 RoHS', NULL),
(287, '1051ISTC303F100', 'C-RES 30 KOHM,+/-1%,1/16W,0402 RoHS', NULL),
(288, '8031ISTC4000069', 'CONN SMT 2.2mm 2 pin top entry type RoHS', NULL),
(289, '1061ISTD4000095', 'TVS diode  Vr=51V  600W RoHS', NULL),
(290, '1161ISTF4000100', 'PTC fuse  I_hold=0 05A  V_max=60VDC RoHS', NULL),
(291, '1041ISTC4000079', 'E-CAP 330uF 25V SMD RoHS (Rubycon)', NULL),
(292, '1041ISTC4000052', 'C-CAP 470nF10V/16V/25V +/-10% 0603 RoHS', NULL),
(293, '8041ISTC4000053', 'C-CAP  220pF 25V/50V 5% C0G  0402 RoHS', NULL),
(294, '8041ISTC4000054', 'C-CAP  1nF 50V/100V 10% X7R 0402 RoHS', NULL),
(295, '8021ISTIC400001', 'IC  ADS1220IRVAT TI ROHS:', NULL),
(296, '1051ISTC4000025', 'C-RES 510R +/-0.1% 1/10W 10PPM 0603 RoHS', NULL),
(297, '1051ISTC471F001', 'C-RES 470 Ohm +/-1% 1/16W 0402 RoHS', NULL),
(298, '1051ISTC4000026', 'C-RES 4.7Ohm +/-1%  1/16W 0402 RoHS', NULL),
(299, '1061ISTD4000047', 'DIODE SMD  TPD1E10B06DPYR RoHS', NULL),
(300, '1031ISTC4000030', 'CONN S3B-PH-SM4-TB 3PIN RoHS', NULL),
(301, '8011ISTP42306SN', 'PCB42306, 3x2Units, FR4, RoHS', NULL),
(302, '1021ISTI4000039', 'IC TPS7A4101DGN RoHS', NULL),
(303, '8041ISTC4000040', 'C-CAP 10UF 50V 1210 10% X7R RoHS', NULL),
(304, '1051ISTC4000082', 'C-RES 1MOhm  +/-1% 1/16W 0402 RoHS', NULL),
(305, '1051ISTC4000041', 'C-RES 430K +/-1% 1/16W 100PPM 0402 RoHS', NULL),
(306, '1051ISTC4000091', 'C-RES 910R +/-1% 2W 100PPM 2512 RoHS', NULL),
(307, '1051ISTC4000092', 'C-RES 100R +/-1% 3/4W 200PPM 2010 RoHS', NULL),
(308, '1061ISTD4000093', 'DIODE TVS SINGLE UNI-DIR 30V 600W RoHS', NULL),
(309, '1061ISTD4000084', 'DIODE SMD  BAT54CW RoHS', NULL),
(310, '1031ISTC4000094', 'CONNECTOR M20-8770242 RoHS', NULL),
(311, '8031ISTC4000086', 'CONN WECO 950-D-SMD-DS (12 poles) RoHS', NULL),
(312, '8031ISTC4000075', 'CONN FW-09-03-G-D-215-150-P-TR RoHS', NULL),
(313, '1161ISTF2000425', 'Fuses - PPTC 0.05A 30V 1210 RoHS', NULL),
(314, '1021ISTI4000080', 'SWT 1:2 SPDT Analog RoHS', NULL),
(315, '1051ISTC4000081', 'C-RES 270kOhm  +/-1% 1/16W 0402 RoHS', NULL),
(316, '1051ISTR4000096', 'C-RES 1.8M 1%  0.063W TK100 0402 RoHS', NULL),
(317, '1051ISTC4000083', 'C-RES 267Ohm+/-0.1% 1/10W 10PPM 0603RoHS', NULL),
(318, '1131ISTT4000085', 'TRAN SMD  BC847CW RoHS', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `models`
--

CREATE TABLE `models` (
  `id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (PK)',
  `model_code` varchar(50) NOT NULL COMMENT 'รหัสรุ่น เช่น MODEL-A001',
  `description` varchar(255) DEFAULT NULL COMMENT 'รายละเอียดรุ่นงาน',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้าง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ลูกค้าเจ้าของรุ่น'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รุ่นงาน/ผลิตภัณฑ์ (Model) - ข้อมูลรุ่นผลิตภัณฑ์';

--
-- Dumping data for table `models`
--

INSERT INTO `models` (`id`, `model_code`, `description`, `created_at`, `remark`) VALUES
(5, '3003ISTSENMBUSA', 'SEMI SMD FOR SENSONIC3 M-BUS MODULE', '2026-01-03 11:04:51', NULL),
(6, '3003ISTCALSUB0A', 'SEMI SMD FOR SENSONIC3 CAL SUBPCB', '2026-01-03 11:05:20', NULL),
(7, '3003ISTSENCALMB', 'SEMI SMD SENSONIC3 CAL MAIN', '2026-01-03 11:05:56', NULL),
(8, '3003ISTPULSUB0A', 'SEMI SMD FOR SENSONIC3 PULSONIC SUBPCB', '2026-01-03 11:06:18', NULL),
(11, '3003ISTSENCOMPA', 'SEMI SMD FOR SENSONIC3 COMPACT', '2026-01-03 11:07:50', NULL),
(13, '3003ISTSFLEXSOC', 'SEMI FLEX FOR SOC', '2026-01-10 00:45:52', NULL),
(14, '3003ISTNEWFLEXA', 'SEMI FLEXIUM new design', '2026-01-10 00:46:04', NULL),
(15, '3003ISTS6000342', 'SEMI SMD SoC-WMM 6000342 Vishay  OHIO', '2026-01-10 00:49:38', NULL),
(16, '3003ISTSMDREMOT', 'SEMI SMD SoC-HCA Remote', '2026-01-10 00:51:47', NULL),
(17, '4993ISTULTEGOMD', 'ULTEGO Module', '2026-01-10 00:52:00', NULL),
(18, '3003IST6000185A', 'SEMI SMD SoC-HCA Remote OMS', '2026-01-10 08:39:53', NULL),
(19, '3003IST6000206A', 'SEMI SMD SoC-HCA 6000206 HCA OHIO', '2026-01-10 08:43:15', NULL),
(20, '3003IST6000184A', 'SEMI SMD FOR SoC-HCA V2', '2026-01-10 08:51:03', NULL),
(21, '3003IST6000329A', 'SEMI SMD FOR WMM (xtal 2002303) Vishay', '2026-01-10 09:03:41', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `model_revisions`
--

CREATE TABLE `model_revisions` (
  `id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (PK)',
  `model_id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (FK -> models)',
  `revision` char(2) NOT NULL COMMENT 'เลขเวอร์ชัน เช่น 01, 02',
  `status` enum('DRAFT','ACTIVE','OBSOLETE') DEFAULT 'DRAFT' COMMENT 'สถานะ: DRAFT=ร่าง, ACTIVE=ใช้งาน, OBSOLETE=ยกเลิก',
  `remark` varchar(255) DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลในการแก้ไข',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้าง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='เวอร์ชันรุ่นงาน (Revision) - เวอร์ชันของแต่ละรุ่นผลิตภัณฑ์';

--
-- Dumping data for table `model_revisions`
--

INSERT INTO `model_revisions` (`id`, `model_id`, `revision`, `status`, `remark`, `created_at`) VALUES
(8, 14, 'A', 'DRAFT', NULL, '2026-01-10 00:53:46'),
(9, 13, 'A', 'DRAFT', NULL, '2026-01-10 00:55:35'),
(10, 13, 'D', 'DRAFT', NULL, '2026-01-10 00:56:00'),
(13, 19, 'A', 'DRAFT', NULL, '2026-01-10 08:43:36'),
(14, 17, 'F', 'DRAFT', NULL, '2026-01-10 08:49:18'),
(15, 20, 'A', 'DRAFT', NULL, '2026-01-10 08:53:30'),
(16, 21, 'A', 'DRAFT', NULL, '2026-01-10 09:06:50'),
(18, 16, 'B', 'DRAFT', NULL, '2026-01-10 09:12:17'),
(21, 7, 'A', 'DRAFT', NULL, '2026-01-10 09:33:13'),
(22, 18, 'A', 'DRAFT', NULL, '2026-01-10 09:45:21'),
(26, 15, 'B', 'DRAFT', NULL, '2026-01-10 09:54:52');

-- --------------------------------------------------------

--
-- Table structure for table `production_lines`
--

CREATE TABLE `production_lines` (
  `id` int(11) NOT NULL,
  `line_name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_lines`
--

INSERT INTO `production_lines` (`id`, `line_name`, `status`) VALUES
(1, 'Line 1A', 'active'),
(2, 'Line 2A', 'active'),
(3, 'Line 3', 'inactive'),
(4, 'Line 4', 'inactive'),
(5, 'Line 5', 'inactive'),
(6, 'Line 6', 'inactive'),
(7, 'Line 7', 'inactive'),
(8, 'Line 8', 'inactive'),
(9, 'Line 9', 'inactive'),
(10, 'Line 10', 'inactive');

-- --------------------------------------------------------

--
-- Table structure for table `production_orders`
--

CREATE TABLE `production_orders` (
  `id` int(11) NOT NULL COMMENT 'รหัสใบสั่งผลิต (PK)',
  `order_no` varchar(20) DEFAULT NULL COMMENT 'เลขที่ใบสั่งผลิต',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้สร้างใบสั่ง (FK -> users)',
  `status` enum('pending','preparing','completed','cancelled') DEFAULT 'pending' COMMENT 'สถานะ: pending=รอ, preparing=กำลังเตรียม, completed=เสร็จ, cancelled=ยกเลิก',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการยกเลิก',
  `created_at` datetime DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างใบสั่ง',
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'วันเวลาที่แก้ไขล่าสุด'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ใบสั่งผลิต (Production Order) - คำสั่งเบิกวัสดุเพื่อผลิต';

--
-- Dumping data for table `production_orders`
--

INSERT INTO `production_orders` (`id`, `order_no`, `user_id`, `status`, `remark`, `created_at`, `updated_at`) VALUES
(5, '20260505-1', 7, 'completed', 'Line 1A', '2026-05-05 10:31:46', '2026-05-05 10:27:45'),
(6, '20260505-2', 7, 'completed', 'Line 1A', '2026-05-05 10:36:59', '2026-05-05 10:30:26');

-- --------------------------------------------------------

--
-- Table structure for table `production_order_items`
--

CREATE TABLE `production_order_items` (
  `id` int(11) NOT NULL COMMENT 'รหัสรายการ (PK)',
  `order_id` int(11) NOT NULL COMMENT 'รหัสใบสั่งผลิต (FK -> production_orders)',
  `material_id` int(11) NOT NULL COMMENT 'รหัสวัสดุ (FK -> materials)',
  `target_qty` int(11) NOT NULL COMMENT 'จำนวนเป้าหมายที่ต้องเบิก',
  `picked_qty` int(11) DEFAULT 0 COMMENT 'จำนวนที่เบิกไปแล้ว',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เบิกไม่ครบ, รอของ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='รายการในใบสั่งผลิต - วัสดุที่ต้องเบิกตามใบสั่งผลิต';

--
-- Dumping data for table `production_order_items`
--

INSERT INTO `production_order_items` (`id`, `order_id`, `material_id`, `target_qty`, `picked_qty`, `remark`) VALUES
(24, 5, 74, 1, 1, NULL),
(25, 6, 74, 1, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `production_reservations`
--

CREATE TABLE `production_reservations` (
  `id` int(11) NOT NULL COMMENT 'รหัสการจอง (PK)',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้จอง (FK -> users)',
  `model_id` int(11) NOT NULL COMMENT 'รหัสรุ่นงาน (FK -> models)',
  `revision_id` int(11) NOT NULL COMMENT 'รหัสเวอร์ชัน (FK -> model_revisions)',
  `production_qty` int(11) NOT NULL COMMENT 'จำนวนที่จะผลิต',
  `status` enum('active','cancelled','completed') DEFAULT 'active' COMMENT 'สถานะ: active=กำลังจอง, cancelled=ยกเลิก, completed=เสร็จ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่จอง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการจอง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='การจองวัสดุ (Reservation) - จองวัสดุสำหรับการผลิต';

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL COMMENT 'รหัสสินค้า (PK)',
  `slot_id` int(11) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL COMMENT 'รหัสพาร์ท (ตรงกับ HanaPart / material_code)',
  `qty` int(11) DEFAULT 0 COMMENT 'จำนวนคงเหลือในช่องนี้',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ของชำรุด, ต้องตรวจสอบ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='สินค้า/วัสดุในตำแหน่ง (Product) - ข้อมูลวัสดุที่เก็บอยู่ในแต่ละช่อง';

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `slot_id`, `name`, `qty`, `remark`) VALUES
(1, 1, '1041ISTC4000079', 0, NULL),
(2, 2, '8031ISTC4000069', 0, NULL),
(3, 3, '1061ISTD4000093', 1, NULL),
(4, 4, '1161ISTS4000027', 9, NULL),
(5, 41, '8011ISTP42604AP', 0, NULL),
(6, 42, '8011ISTP42306SN', 0, NULL),
(7, 43, '8011ISTP29101AP', 0, NULL),
(8, 44, '8021ISTPVQFNSOC', 2, NULL),
(9, 45, '1121ISTL2000321', 2, NULL),
(10, 46, '1061ISTD2000320', 4, NULL),
(11, 47, '8041ISTC3R9B501', 1, NULL),
(12, 48, '8041ISTC6000193', 10, NULL),
(13, 49, '8091ISTI6000197', 2, NULL),
(14, 50, '1091ISTI6000197', 1, NULL),
(15, 53, '1051ISTC000J200', 1, NULL),
(16, 54, '1051ISTC223F200', 1, NULL),
(17, 55, '1051ISTC393F200', 1, NULL),
(18, 56, '1051ISTC563F100', 3, NULL),
(19, 57, '1051ISTC2M2F100', 2, NULL),
(20, 58, '1051ISTC471F001', 1, NULL),
(21, 59, '1051ISTC472F001', 2, NULL),
(22, 60, '1051ISTC473F001', 1, NULL),
(23, 61, '1051ISTC4000091', 2, NULL),
(24, 62, '1051ISTC4000026', 1, NULL),
(25, 63, '1081ISTC6000195', 1, NULL),
(26, 64, '1081ISTC6000196', 5, NULL),
(27, 65, '1091ISTI6000198', 4, NULL),
(28, 66, '1091ISTI6000199', 1, NULL),
(29, 67, '1091ISTI6000200', 3, NULL),
(30, 68, '1051ISTNTCTHER3', 45, NULL),
(31, 69, '8041ISTC200J001', 10, NULL),
(32, 70, '8041ISTC3R3B501', 1, NULL),
(33, 71, '8041ISTC224K100', 2, NULL),
(34, 72, '8041ISTC6000188', 3, NULL),
(35, 73, '8041ISTC6000189', 2, NULL),
(36, 74, '8041ISTC6000190', 2, NULL),
(37, 75, '8041ISTC6000192', 1, NULL),
(38, 76, '8041ISTC6000194', 3, NULL),
(39, 77, '1051ISTR2002009', 1, NULL),
(40, 78, '1051ISTR2002010', 2, NULL),
(41, 79, '1061ISTD2002012', 3, NULL),
(42, 80, '1131ISTT2002014', 1, NULL),
(43, 81, '8091ISTI6000347', 2, NULL),
(54, 92, '1121ISTLEDLST67', 2, NULL),
(55, 93, '1061ISTD4000032', 6, NULL),
(56, 94, '1061ISTD2000449', 0, NULL),
(57, 95, '1051ISTC4000022', 2, NULL),
(59, 97, '8011ISTP42108SN', 7, NULL),
(60, 98, '8141ISTFLX50401', 0, NULL),
(61, 99, '1031ISTC2002016', 1, NULL),
(62, 100, '1161ISTS2000322', 1, NULL),
(63, 101, '1031ISTCON53327', 0, NULL),
(64, 102, '8021ISTI2000469', 3, NULL),
(65, 103, '8041ISTC104Z161', 3, NULL),
(66, 104, '1051ISTC184F011', 2, NULL),
(67, 105, '1051ISTC000F100', 2, NULL),
(68, 106, '1051ISTC474F001', 0, NULL),
(69, 107, '1051ISTC331J001', 3, NULL),
(70, 108, '1051ISTC335F001', 4, NULL),
(71, 109, '1051ISTC4000083', 4, NULL),
(72, 110, '1051ISTC332F001', 1, NULL),
(73, 111, '1051ISTC4000082', 1, NULL),
(74, 112, '1051ISTC303F100', 0, NULL),
(75, 113, '1051ISTC4000020', 2, NULL),
(76, 114, '1051ISTC4000021', 1, NULL),
(77, 115, '1051ISTC4000025', 2, NULL),
(78, 116, '1051ISTC2000428', 0, NULL),
(79, 117, '1051ISTR4000096', 0, NULL),
(80, 118, '1051ISTC154F011', 2, NULL),
(81, 121, '8041ISTC6000191', 2, NULL),
(82, 122, '8041ISTC101J161', 1, NULL),
(83, 123, '8041ISTC103J101', 11, NULL),
(84, 124, '8041ISTC470M501', 4, NULL),
(85, 125, '8041ISTC4000010', 2, NULL),
(86, 126, '8041ISTC4000007', 3, NULL),
(87, 127, '8041ISTC4000011', 2, NULL),
(88, 128, '1041ISTC4000052', 1, NULL),
(89, 129, '8041ISTC4000012', 1, NULL),
(90, 130, '8041ISTC4000048', 2, NULL),
(91, 131, '8041ISTC4000058', 2, NULL),
(92, 132, '1041ISTC4000144', 0, NULL),
(93, 133, '1041ISTC4000045', 0, NULL),
(94, 134, '8041ISTC150J101', 2, NULL),
(95, 135, '8041ISTC1R0B001', 2, NULL),
(96, 136, '8041ISTC120G501', 2, NULL),
(97, 137, '1041ISTC6000189', 2, NULL),
(98, 138, '1041ISTC6000187', 2, NULL),
(99, 139, '1041ISTC6000194', 3, NULL),
(100, 140, '1041ISTC6000192', 4, NULL),
(101, 141, '1091ISTC82NH040', 2, NULL),
(102, 142, '8041ISTC4000019', 1, NULL),
(103, 143, '8041ISTC4000051', 2, NULL),
(104, 144, '8041ISTC222K251', 2, NULL),
(105, 145, '8041ISTC4000057', 2, NULL),
(106, 146, '8041ISTC154K161', 1, NULL),
(107, 147, '8041ISTC4000034', 2, NULL),
(108, 148, '8041ISTC4000059', 2, NULL),
(109, 149, '1081ISTC2000303', 1, NULL),
(110, 150, '8041ISTC4000008', 0, NULL),
(111, 151, '8041ISTC4000035', 0, NULL),
(112, 152, '1081ISTC4000114', 4, NULL),
(113, 153, '1061ISTD4000084', 4, NULL),
(114, 154, '1021ISTI4000080', 1, NULL),
(115, 155, '1091ISTI6000347', 0, NULL),
(116, 156, '1091ISTI2000334', 2, NULL),
(117, 157, '1091ISTI2000323', 13, NULL),
(118, 158, '1051ISTNTCTHER0', 2, NULL),
(119, 159, '1051ISTC2000429', 2, NULL),
(120, 162, '1041ISTC6000190', 0, NULL),
(121, 163, '1051ISTR6000201', 5, NULL),
(122, 164, '1051ISTR6000204', 10, NULL),
(123, 165, '1041ISTC6000191', 0, NULL),
(124, 166, '1051ISTR6000202', 5, NULL),
(125, 167, '1051ISTR6000211', 0, NULL),
(126, 168, '1041ISTC6000193', 3, NULL),
(127, 169, '1051ISTR6000203', 5, NULL),
(128, 170, '8061ISTD6000401', 2, NULL),
(129, 171, '1051ISTC4000081', 2, NULL),
(130, 172, '1051ISTC4000049', 0, NULL),
(131, 173, '1051ISTC4000092', 0, NULL),
(132, 174, '8041ISTC221K161', 0, NULL),
(133, 175, '8091ISTC4000015', 1, NULL),
(134, 176, '8091ISTC4000016', 0, NULL),
(135, 177, '8091ISTC4000018', 0, NULL),
(136, 178, '1161ISTF2000249', 1, NULL),
(137, 179, '8091ISTC4000017', 1, NULL),
(138, 180, '8041ISTC4000053', 0, NULL),
(139, 181, '1041ISTC6000188', 0, NULL),
(140, 182, '8041ISTC4000040', 1, NULL),
(141, 183, '1051ISTC102K100', 3, NULL),
(142, 184, '1051ISTC4000041', 1, NULL),
(143, 185, '1081ISTC4000113', 1, NULL),
(144, 186, '8041ISTC1R5B001', 1, NULL),
(145, 187, '8041ISTC4000056', 1, NULL),
(146, 188, '8041ISTC4000054', 0, NULL),
(147, 189, '8041ISTC4000050', 3, NULL),
(148, 190, '1081ISTC2002303', 6, NULL),
(149, 191, '8041ISTC270G161', 7, NULL),
(150, 192, '1091ISTI2000314', 1, NULL),
(151, 193, '1091ISTC10NH040', 7, NULL),
(152, 194, '1051ISTC2000051', 9, NULL),
(153, 195, '8041ISTC4000009', 3, NULL),
(154, 196, '8041ISTC6000187', 6, NULL),
(155, 197, '8041ISTC4000055', 5, NULL),
(156, 198, '8091ISTC12NHLQW', 2, NULL),
(157, 199, '8021ISTIC400001', 1, NULL),
(158, 200, '8021ISTIC400002', 1, NULL),
(159, 201, '8031ISTC4000086', 1, NULL),
(160, 202, '1031ISTC4000094', 0, NULL),
(161, 203, '1021ISTI4000039', 1, NULL),
(162, 204, '1031ISTC4000030', 0, NULL),
(163, 205, '1031ISTC4000029', 0, NULL),
(164, 206, '8011ISTP70202SN', 1, NULL),
(165, 207, '8011ISTP50104SN', 0, NULL),
(166, 33, '1061ISTD4000024', 1, NULL),
(167, 35, '1061ISTD4000023', 1, NULL),
(168, 36, '8021ISTIC400000', 0, NULL),
(169, 34, '1041ISTE2002001', 1, NULL),
(170, 37, '8031ISTC4000074', 4, NULL),
(171, 38, '8031ISTC4000075', 3, NULL),
(172, 39, '8011ISTP50305SN', 2, NULL),
(173, 40, '8011ISTP51107SN', 12, NULL),
(174, 208, '1041ISTE4000037', 0, NULL),
(175, 160, '1031ISTCON3PINX', 0, NULL),
(176, 209, '1201COMSDPAT43R', 3, NULL),
(177, 210, '1051ISTC104F011', 5, NULL),
(178, 211, '1041ISTC6000333', 1, NULL),
(179, 212, '1131ISTT2002015', 2, NULL),
(180, 213, '1131ISTT4000085', 4, NULL),
(181, 222, '8091ISTI6000200', 1, NULL),
(182, 223, '1161ISTF2000425', 3, NULL),
(183, 224, '1051ISTR2002008', 1, NULL),
(184, 119, '1091ISTLEMC3225', 2, NULL),
(185, 120, '1061ISTD4000047', 0, NULL),
(186, 161, '8091ISTI6000198', 1, NULL),
(187, 225, '8011ISTP51107AP', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `racks`
--

CREATE TABLE `racks` (
  `id` int(11) NOT NULL COMMENT 'รหัสตู้/ชั้นวาง (PK)',
  `name` varchar(50) DEFAULT NULL COMMENT 'ชื่อตู้ เช่น Rack-A, Rack-B',
  `location_desc` varchar(255) DEFAULT NULL COMMENT 'คำอธิบายตำแหน่งตู้ เช่น โซน A ฝั่งซ้าย',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น ตู้เก่า, ย้ายตำแหน่ง',
  `io_device_id` int(11) DEFAULT NULL,
  `io_red_pin` int(11) DEFAULT NULL,
  `io_yellow_pin` int(11) DEFAULT NULL,
  `io_green_pin` int(11) DEFAULT NULL,
  `io_buzzer_pin` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ตู้/ชั้นวาง (Rack) - ตู้เก็บของหลัก';

--
-- Dumping data for table `racks`
--

INSERT INTO `racks` (`id`, `name`, `location_desc`, `remark`, `io_device_id`, `io_red_pin`, `io_yellow_pin`, `io_green_pin`, `io_buzzer_pin`) VALUES
(1, '1', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, '2', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(3, '3', NULL, NULL, 2, NULL, NULL, 10, NULL),
(5, '4', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(7, '5', NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `reservation_list`
--

CREATE TABLE `reservation_list` (
  `id` int(11) NOT NULL,
  `res_no` varchar(50) DEFAULT NULL,
  `req_date` datetime DEFAULT NULL,
  `store` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `last_update` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservation_list`
--

INSERT INTO `reservation_list` (`id`, `res_no`, `req_date`, `store`, `status`, `last_update`) VALUES
(1, '0017468155', '2026-06-09 17:54:37', NULL, 'Completed', '2026-06-09 12:51:32'),
(8, '0017508305', '2026-06-09 19:58:36', NULL, 'Completed', '2026-06-09 13:24:56'),
(21, '0017508317', '2026-06-09 20:49:02', NULL, 'Completed', '2026-06-10 12:32:59'),
(25, '0017508341', '2026-06-09 21:01:59', NULL, 'Completed', '2026-06-10 12:32:54'),
(27, '0017508762', '2026-06-10 11:03:58', NULL, 'Completed', '2026-06-10 12:33:18'),
(29, '0017508708', '2026-06-10 11:07:00', NULL, 'Completed', '2026-06-11 01:02:53'),
(31, '0017508709', '2026-06-10 11:16:25', NULL, 'Completed', '2026-06-10 12:32:04'),
(49, '0017508753', '2026-06-10 17:31:20', NULL, 'Completed', '2026-06-10 12:33:30'),
(66, '0017509854', '2026-06-10 20:45:07', NULL, 'Completed', '2026-06-10 13:51:10'),
(73, '0017509856', '2026-06-10 20:46:45', NULL, 'Completed', '2026-06-10 13:51:05'),
(89, '0017510303', '2026-06-10 23:26:07', NULL, 'Completed', '2026-06-10 16:27:25'),
(94, '0017510512', '2026-06-11 10:27:35', NULL, 'Completed', '2026-06-11 03:30:51');

-- --------------------------------------------------------

--
-- Table structure for table `slots`
--

CREATE TABLE `slots` (
  `id` int(11) NOT NULL COMMENT 'รหัสช่อง (PK)',
  `box_id` int(11) DEFAULT NULL COMMENT 'รหัสกล่องที่อยู่ (FK -> boxes)',
  `slot_no` int(11) DEFAULT NULL,
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ช่องเก็บของในกล่อง (Block) - แบ่งพื้นที่ย่อยภายในกล่อง';

--
-- Dumping data for table `slots`
--

INSERT INTO `slots` (`id`, `box_id`, `slot_no`, `remark`) VALUES
(1, 1, 1, NULL),
(2, 2, 1, NULL),
(3, 3, 1, NULL),
(4, 4, 1, NULL),
(33, 9, 1, NULL),
(34, 10, 1, NULL),
(35, 11, 1, NULL),
(36, 12, 1, NULL),
(37, 13, 1, NULL),
(38, 14, 1, NULL),
(39, 15, 1, NULL),
(40, 16, 1, NULL),
(41, 17, 1, NULL),
(42, 18, 1, NULL),
(43, 19, 1, NULL),
(44, 20, 1, NULL),
(45, 21, 1, NULL),
(46, 22, 1, NULL),
(47, 23, 1, NULL),
(48, 23, 2, NULL),
(49, 23, 3, NULL),
(50, 23, 4, NULL),
(53, 26, 1, NULL),
(54, 26, 2, NULL),
(55, 26, 3, NULL),
(56, 26, 4, NULL),
(57, 26, 5, NULL),
(58, 26, 6, NULL),
(59, 26, 7, NULL),
(60, 26, 8, NULL),
(61, 26, 9, NULL),
(62, 26, 10, NULL),
(63, 27, 1, NULL),
(64, 27, 2, NULL),
(65, 27, 3, NULL),
(66, 27, 4, NULL),
(67, 27, 5, NULL),
(68, 28, 1, NULL),
(69, 29, 1, NULL),
(70, 29, 2, NULL),
(71, 29, 3, NULL),
(72, 30, 1, NULL),
(73, 30, 2, NULL),
(74, 30, 3, NULL),
(75, 30, 4, NULL),
(76, 30, 5, NULL),
(77, 30, 6, NULL),
(78, 30, 7, NULL),
(79, 30, 8, NULL),
(80, 30, 9, NULL),
(81, 30, 10, NULL),
(92, 31, 1, NULL),
(93, 32, 1, NULL),
(94, 33, 1, NULL),
(95, 34, 1, NULL),
(97, 36, 1, NULL),
(98, 37, 1, NULL),
(99, 38, 1, NULL),
(100, 39, 1, NULL),
(101, 40, 1, NULL),
(102, 41, 1, NULL),
(103, 42, 1, NULL),
(104, 42, 2, NULL),
(105, 42, 3, NULL),
(106, 43, 1, NULL),
(107, 43, 2, NULL),
(108, 43, 3, NULL),
(109, 43, 4, NULL),
(110, 43, 5, NULL),
(111, 43, 6, NULL),
(112, 43, 7, NULL),
(113, 43, 8, NULL),
(114, 43, 9, NULL),
(115, 43, 10, NULL),
(116, 43, 11, NULL),
(117, 43, 12, NULL),
(118, 43, 13, NULL),
(119, 43, 14, NULL),
(120, 43, 15, NULL),
(121, 43, 16, NULL),
(122, 44, 1, NULL),
(123, 44, 2, NULL),
(124, 44, 3, NULL),
(125, 45, 1, NULL),
(126, 45, 2, NULL),
(127, 45, 3, NULL),
(128, 45, 4, NULL),
(129, 45, 5, NULL),
(130, 45, 6, NULL),
(131, 45, 7, NULL),
(132, 45, 8, NULL),
(133, 45, 9, NULL),
(134, 46, 1, NULL),
(135, 46, 2, NULL),
(136, 46, 3, NULL),
(137, 46, 4, NULL),
(138, 46, 5, NULL),
(139, 46, 6, NULL),
(140, 46, 7, NULL),
(141, 46, 8, NULL),
(142, 46, 9, NULL),
(143, 46, 10, NULL),
(144, 47, 1, NULL),
(145, 47, 2, NULL),
(146, 47, 3, NULL),
(147, 47, 4, NULL),
(148, 47, 5, NULL),
(149, 47, 6, NULL),
(150, 47, 7, NULL),
(151, 47, 8, NULL),
(152, 47, 9, NULL),
(153, 48, 1, NULL),
(154, 48, 2, NULL),
(155, 48, 3, NULL),
(156, 48, 4, NULL),
(157, 48, 5, NULL),
(158, 48, 6, NULL),
(159, 48, 7, NULL),
(160, 48, 8, NULL),
(161, 48, 9, NULL),
(162, 49, 1, NULL),
(163, 49, 2, NULL),
(164, 49, 3, NULL),
(165, 49, 4, NULL),
(166, 49, 5, NULL),
(167, 49, 6, NULL),
(168, 49, 7, NULL),
(169, 49, 8, NULL),
(170, 49, 9, NULL),
(171, 50, 1, NULL),
(172, 50, 2, NULL),
(173, 50, 3, NULL),
(174, 50, 4, NULL),
(175, 50, 5, NULL),
(176, 50, 6, NULL),
(177, 50, 7, NULL),
(178, 50, 8, NULL),
(179, 50, 9, NULL),
(180, 50, 10, NULL),
(181, 50, 11, NULL),
(182, 50, 12, NULL),
(183, 50, 13, NULL),
(184, 50, 14, NULL),
(185, 50, 15, NULL),
(186, 50, 16, NULL),
(187, 51, 1, NULL),
(188, 51, 2, NULL),
(189, 51, 3, NULL),
(190, 51, 4, NULL),
(191, 52, 1, NULL),
(192, 52, 2, NULL),
(193, 52, 3, NULL),
(194, 52, 4, NULL),
(195, 53, 1, NULL),
(196, 53, 2, NULL),
(197, 53, 3, NULL),
(198, 53, 4, NULL),
(199, 54, 1, NULL),
(200, 55, 1, NULL),
(201, 56, 1, NULL),
(202, 57, 1, NULL),
(203, 58, 1, NULL),
(204, 59, 1, NULL),
(205, 60, 1, NULL),
(206, 61, 1, NULL),
(207, 62, 1, NULL),
(208, 63, 1, NULL),
(209, 64, 1, NULL),
(210, 23, 5, NULL),
(211, 23, 6, NULL),
(212, 23, 7, NULL),
(213, 23, 8, NULL),
(222, 65, 1, NULL),
(223, 65, 2, NULL),
(224, 65, 3, NULL),
(225, 66, 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `stock_logs`
--

CREATE TABLE `stock_logs` (
  `id` int(11) NOT NULL COMMENT 'รหัสบันทึก (PK)',
  `product_id` int(11) NOT NULL COMMENT 'รหัสสินค้า (FK -> products)',
  `user_id` int(11) NOT NULL COMMENT 'รหัสผู้ดำเนินการ (FK -> users)',
  `action` varchar(255) NOT NULL COMMENT 'การกระทำ เช่น add|จำนวน|PUID หรือ pick_stock',
  `quantity` int(11) NOT NULL COMMENT 'จำนวนที่เพิ่ม/หยิบ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่ดำเนินการ',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น เหตุผลการเบิก, หมายเลขใบเบิก'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ประวัติเคลื่อนไหวสต็อก (Log) - บันทึกการเพิ่ม/หยิบสินค้า';

--
-- Dumping data for table `stock_logs`
--

INSERT INTO `stock_logs` (`id`, `product_id`, `user_id`, `action`, `quantity`, `created_at`, `remark`) VALUES
(1, 3, 7, 'add|2842|08DTQ3', 1, '2026-06-09 08:56:43', NULL),
(2, 4, 7, 'add|550|08G5J1', 1, '2026-06-09 08:57:08', NULL),
(3, 4, 7, 'add|550|08G5J2', 1, '2026-06-09 08:57:34', NULL),
(4, 4, 7, 'add|550|08G5IW', 1, '2026-06-09 08:57:57', NULL),
(5, 4, 7, 'add|550|08G5IY', 1, '2026-06-09 08:58:29', NULL),
(6, 4, 7, 'add|550|08G5J5', 1, '2026-06-09 08:58:41', NULL),
(7, 4, 7, 'add|550|08G5J0', 1, '2026-06-09 08:58:59', NULL),
(8, 4, 7, 'add|550|08G5J6', 1, '2026-06-09 08:59:14', NULL),
(9, 4, 7, 'add|550|08G5IB', 1, '2026-06-09 08:59:28', NULL),
(10, 4, 7, 'add|550|08G5IF', 1, '2026-06-09 09:00:11', NULL),
(11, 174, 7, 'add|500|08BRC4', 1, '2026-06-09 09:00:27', NULL),
(12, 174, 7, 'add|500|08BRC3', 1, '2026-06-09 09:00:41', NULL),
(13, 174, 7, 'add|500|08BRE9', 1, '2026-06-09 09:00:52', NULL),
(14, 174, 7, 'add|500|08BREA', 1, '2026-06-09 09:01:05', NULL),
(15, 174, 7, 'add|500|08BRE7', 1, '2026-06-09 09:01:16', NULL),
(16, 174, 7, 'add|500|08BRE8', 1, '2026-06-09 09:01:26', NULL),
(17, 174, 7, 'add|500|08BREM', 1, '2026-06-09 09:01:35', NULL),
(18, 176, 7, 'add|500|08KNHB', 1, '2026-06-09 09:01:54', NULL),
(19, 176, 7, 'add|500|08KNHD', 1, '2026-06-09 09:02:03', NULL),
(20, 176, 7, 'add|500|08KNHA', 1, '2026-06-09 09:02:18', NULL),
(21, 8, 7, 'add|1542|08B949', 1, '2026-06-09 09:02:37', NULL),
(22, 9, 7, 'add|4885|08BV7U', 1, '2026-06-09 09:03:02', NULL),
(23, 9, 7, 'add|6000|08BV7Q', 1, '2026-06-09 09:03:17', NULL),
(24, 9, 7, 'add|6000|08BV7R', 1, '2026-06-09 09:03:31', NULL),
(25, 9, 7, 'add|6000|08BV7O', 1, '2026-06-09 09:03:51', NULL),
(26, 9, 7, 'add|6000|08BV7W', 1, '2026-06-09 09:04:58', NULL),
(27, 10, 7, 'add|5595|08J9DI', 1, '2026-06-09 09:05:23', NULL),
(28, 10, 7, 'add|6000|08J9CT', 1, '2026-06-09 09:06:02', NULL),
(29, 10, 7, 'add|6000|08J9CS', 1, '2026-06-09 09:06:23', NULL),
(30, 10, 7, 'add|6000|08J9CW', 1, '2026-06-09 09:06:37', NULL),
(31, 10, 7, 'add|6000|08J9CV', 1, '2026-06-09 09:06:51', NULL),
(32, 10, 7, 'add|6000|08J9CX', 1, '2026-06-09 09:07:04', NULL),
(33, 11, 7, 'add|1220|08EAQ3', 1, '2026-06-09 09:07:30', NULL),
(34, 11, 7, 'add|10000|08EAPZ', 1, '2026-06-09 09:07:45', NULL),
(35, 11, 7, 'add|10000|08EAQ2', 1, '2026-06-09 09:07:57', NULL),
(36, 11, 7, 'add|10000|08EAQ1', 1, '2026-06-09 09:08:08', NULL),
(37, 12, 7, 'add|490|05QFIP', 1, '2026-06-09 09:08:26', NULL),
(38, 12, 7, 'add|4000|05QFIN', 1, '2026-06-09 09:08:45', NULL),
(39, 12, 7, 'add|4000|05QFIM', 1, '2026-06-09 09:09:04', NULL),
(40, 12, 7, 'add|4000|05QFIK', 1, '2026-06-09 09:09:21', NULL),
(41, 12, 7, 'add|4000|05QFIJ', 1, '2026-06-09 09:09:34', NULL),
(42, 12, 7, 'add|3995|05QFJB', 1, '2026-06-09 09:09:50', NULL),
(43, 12, 7, 'add|4000|05QFIH', 1, '2026-06-09 09:10:03', NULL),
(44, 12, 7, 'add|4000|05QFII', 1, '2026-06-09 09:10:15', NULL),
(45, 12, 7, 'add|3995|05QFIO', 1, '2026-06-09 09:10:28', NULL),
(46, 12, 7, 'add|4000|05QFIL', 1, '2026-06-09 09:10:41', NULL),
(47, 12, 7, 'add|4000|05QFIG', 1, '2026-06-09 09:11:04', NULL),
(48, 13, 7, 'add|2940|05OLD9', 1, '2026-06-09 09:11:22', NULL),
(49, 13, 7, 'add|9995|05OLD6', 1, '2026-06-09 09:11:46', NULL),
(50, 13, 7, 'add|10000|05OLDA', 1, '2026-06-09 09:11:59', NULL),
(51, 14, 7, 'add|3333|07EEQE', 1, '2026-06-09 09:12:16', NULL),
(52, 177, 7, 'add|1214|05NEN9', 1, '2026-06-09 09:12:57', NULL),
(53, 177, 7, 'add|10000|05NEOD', 1, '2026-06-09 09:13:15', NULL),
(54, 177, 7, 'add|10000|05NEOA', 1, '2026-06-09 09:13:27', NULL),
(55, 177, 7, 'add|10000|05NELJ', 1, '2026-06-09 09:13:40', NULL),
(56, 177, 7, 'add|3124|05NEOF', 1, '2026-06-09 09:13:53', NULL),
(57, 177, 7, 'add|10000|05NENN', 1, '2026-06-09 09:14:11', NULL),
(58, 177, 7, 'add|10000|05NEOC', 1, '2026-06-09 09:14:25', NULL),
(59, 177, 7, 'add|10000|05NEOG', 1, '2026-06-09 09:14:39', NULL),
(60, 178, 7, 'add|3113|07EHNL', 1, '2026-06-09 09:14:55', NULL),
(61, 178, 7, 'add|9995|07EHMI', 1, '2026-06-09 09:15:10', NULL),
(62, 179, 7, 'add|2082|08M90V', 1, '2026-06-09 09:15:20', NULL),
(63, 179, 7, 'add|3000|08M915', 1, '2026-06-09 09:15:30', NULL),
(64, 180, 7, 'add|235|06RDUC', 1, '2026-06-09 09:15:48', NULL),
(65, 180, 7, 'add|2365|0898HA', 1, '2026-06-09 09:16:04', NULL),
(66, 180, 7, 'add|3000|06RDUE', 1, '2026-06-09 09:16:35', NULL),
(67, 180, 7, 'add|3000|06RDUD', 1, '2026-06-09 09:16:59', NULL),
(68, 16, 5, 'add|2348|08D5NP', 1, '2026-06-09 09:17:47', NULL),
(69, 16, 5, 'add|5000|08D5N8', 1, '2026-06-09 09:18:00', NULL),
(70, 17, 5, 'add|3296|08A6OB', 1, '2026-06-09 09:18:12', NULL),
(71, 17, 5, 'add|5000|08A6OA', 1, '2026-06-09 09:18:26', NULL),
(72, 18, 5, 'add|3761|08DNRH', 1, '2026-06-09 09:18:41', NULL),
(73, 18, 5, 'add|10000|08DNS8', 1, '2026-06-09 09:18:57', NULL),
(74, 19, 5, 'add|3359|08E1OQ', 1, '2026-06-09 09:19:39', NULL),
(75, 20, 5, 'add|10000|088TD4', 1, '2026-06-09 09:19:56', NULL),
(76, 21, 5, 'add|10000|08LENO', 1, '2026-06-09 09:21:25', NULL),
(77, 21, 5, 'add|10000|08LENJ', 1, '2026-06-09 09:21:42', NULL),
(78, 22, 5, 'add|10000|08DVUP', 1, '2026-06-09 09:21:53', NULL),
(79, 15, 5, 'add|5000|08BRIA', 1, '2026-06-09 09:22:02', NULL),
(80, 23, 5, 'add|1197|08DQ0P', 1, '2026-06-09 09:22:13', NULL),
(81, 23, 5, 'add|4000|08DQ0O', 1, '2026-06-09 09:22:30', NULL),
(82, 24, 5, 'add|10000|08EXJ9', 1, '2026-06-09 09:22:46', NULL),
(83, 25, 5, 'add|3000|06OCU4', 1, '2026-06-09 09:23:31', NULL),
(84, 25, 5, 'add|1651|06OCU5', 1, '2026-06-09 09:23:46', NULL),
(85, 26, 5, 'add|3000|06H8XO', 1, '2026-06-09 09:24:07', NULL),
(86, 26, 5, 'add|3000|06H8Y0', 1, '2026-06-09 09:24:20', NULL),
(87, 26, 5, 'add|3000|06H8XX', 1, '2026-06-09 09:24:33', NULL),
(88, 26, 5, 'add|3000|06H8XY', 1, '2026-06-09 09:24:51', NULL),
(89, 26, 5, 'add|3000|06H8XV', 1, '2026-06-09 09:25:38', NULL),
(90, 26, 5, 'add|886|06H8XW', 1, '2026-06-09 09:25:54', NULL),
(91, 28, 5, 'add|3995|06KU29', 1, '2026-06-09 09:26:09', NULL),
(92, 28, 5, 'add|2933|06KU26', 1, '2026-06-09 09:26:22', NULL),
(93, 27, 5, 'add|9490|07EE8G', 1, '2026-06-09 09:28:25', NULL),
(94, 27, 5, 'add|9995|07EE8I', 1, '2026-06-09 09:28:39', NULL),
(95, 27, 5, 'add|10000|07EE5P', 1, '2026-06-09 09:28:54', NULL),
(96, 27, 5, 'add|10000|07EE8H', 1, '2026-06-09 09:29:07', NULL),
(97, 27, 5, 'add|10000|07EE8N', 1, '2026-06-09 09:29:24', NULL),
(98, 29, 5, 'add|5384|07ED0Y', 1, '2026-06-09 09:30:55', NULL),
(99, 29, 5, 'add|9985|07ED0G', 1, '2026-06-09 09:31:13', NULL),
(100, 29, 5, 'add|10000|07ECZP', 1, '2026-06-09 09:31:30', NULL),
(101, 29, 5, 'add|10000|07ECZS', 1, '2026-06-09 09:31:45', NULL),
(102, 30, 5, 'add|4000|08E0IN', 1, '2026-06-09 09:32:02', NULL),
(103, 30, 5, 'add|4000|08E0IM', 1, '2026-06-09 09:32:10', NULL),
(104, 30, 5, 'add|4000|08E0NS', 1, '2026-06-09 09:32:19', NULL),
(105, 30, 5, 'add|4000|08E0NO', 1, '2026-06-09 09:32:28', NULL),
(106, 30, 5, 'add|4000|08E0O6', 1, '2026-06-09 09:32:38', NULL),
(107, 30, 5, 'add|4000|08E0OA', 1, '2026-06-09 09:32:46', NULL),
(108, 30, 5, 'add|4000|08E0OB', 1, '2026-06-09 09:32:56', NULL),
(109, 30, 5, 'add|4000|08E0O8', 1, '2026-06-09 09:33:16', NULL),
(110, 30, 5, 'add|4000|08E0NT', 1, '2026-06-09 09:33:27', NULL),
(111, 30, 5, 'add|4000|08E0NV', 1, '2026-06-09 09:33:35', NULL),
(112, 30, 5, 'add|4000|08E0IJ', 1, '2026-06-09 09:33:45', NULL),
(113, 30, 5, 'add|4000|08E0O3', 1, '2026-06-09 09:33:54', NULL),
(114, 30, 5, 'add|4000|08E0O4', 1, '2026-06-09 09:34:11', NULL),
(115, 30, 5, 'add|4000|08E0O5', 1, '2026-06-09 09:34:20', NULL),
(116, 30, 5, 'add|4000|08E0O9', 1, '2026-06-09 09:34:28', NULL),
(117, 30, 5, 'add|4000|08E0NN', 1, '2026-06-09 09:34:35', NULL),
(118, 30, 5, 'add|4000|08E0NR', 1, '2026-06-09 09:34:43', NULL),
(119, 30, 5, 'add|4000|08E0NW', 1, '2026-06-09 09:34:52', NULL),
(120, 30, 5, 'add|4000|08E0NQ', 1, '2026-06-09 09:35:03', NULL),
(121, 30, 5, 'add|4000|08E0O2', 1, '2026-06-09 09:35:15', NULL),
(122, 31, 5, 'add|10000|08D5VJ', 1, '2026-06-09 09:36:05', NULL),
(123, 31, 5, 'add|10000|08D5TD', 1, '2026-06-09 09:36:18', NULL),
(124, 31, 5, 'add|10000|08D5TG', 1, '2026-06-09 09:36:27', NULL),
(125, 31, 5, 'add|10000|08D5TH', 1, '2026-06-09 09:36:35', NULL),
(126, 31, 5, 'add|10000|08D5TE', 1, '2026-06-09 09:36:44', NULL),
(127, 31, 5, 'add|10000|08D5TF', 1, '2026-06-09 09:36:52', NULL),
(128, 31, 5, 'add|10000|08D5TA', 1, '2026-06-09 09:37:18', NULL),
(129, 31, 5, 'add|10000|08D5RZ', 1, '2026-06-09 09:37:31', NULL),
(130, 31, 5, 'add|10000|08D5RW', 1, '2026-06-09 09:37:39', NULL),
(131, 31, 5, 'add|10000|08D5RX', 1, '2026-06-09 09:37:50', NULL),
(132, 31, 5, 'add|9190|08D5VI', 1, '2026-06-09 09:37:59', NULL),
(133, 31, 5, 'add|10000|08D5VN', 1, '2026-06-09 09:38:08', NULL),
(134, 31, 5, 'add|10000|08D5RY', 1, '2026-06-09 09:38:19', NULL),
(135, 32, 5, 'add|10000|08CR7X', 1, '2026-06-09 09:38:37', NULL),
(136, 32, 5, 'add|10000|08CR7Y', 1, '2026-06-09 09:38:46', NULL),
(137, 32, 5, 'add|10000|08CR7Z', 1, '2026-06-09 09:38:55', NULL),
(138, 32, 5, 'add|3845|08ARDF', 1, '2026-06-09 09:39:05', NULL),
(139, 33, 5, 'add|529|08D5J6', 1, '2026-06-09 09:39:34', NULL),
(140, 33, 5, 'add|3000|088B5U', 1, '2026-06-09 09:39:44', NULL),
(141, 33, 5, 'add|3000|08D5J4', 1, '2026-06-09 09:39:53', NULL),
(142, 33, 5, 'add|3000|08D5J9', 1, '2026-06-09 09:40:04', NULL),
(143, 34, 5, 'add|8905|05OMXV', 1, '2026-06-09 09:40:53', NULL),
(144, 34, 5, 'add|9995|05OMXY', 1, '2026-06-09 09:41:08', NULL),
(145, 34, 5, 'add|10000|05OMY3', 1, '2026-06-09 09:41:23', NULL),
(146, 34, 5, 'add|10000|05OMXZ', 1, '2026-06-09 09:41:35', NULL),
(147, 35, 5, 'add|9690|05OLPP', 1, '2026-06-09 09:41:50', NULL),
(148, 35, 5, 'add|9995|05OLQC', 1, '2026-06-09 09:42:03', NULL),
(149, 35, 5, 'add|10000|05OLQ5', 1, '2026-06-09 09:42:17', NULL),
(150, 36, 5, 'add|908|05LZTB', 1, '2026-06-09 09:42:36', NULL),
(151, 36, 5, 'add|10000|05LZTE', 1, '2026-06-09 09:42:49', NULL),
(152, 36, 5, 'add|9995|05LZTD', 1, '2026-06-09 09:43:29', NULL),
(153, 37, 5, 'add|9720|05ONG2', 1, '2026-06-09 09:43:39', NULL),
(154, 38, 5, 'add|3483|05QF9Q', 1, '2026-06-09 09:44:01', NULL),
(155, 38, 5, 'add|10000|05QF9U', 1, '2026-06-09 09:44:13', NULL),
(156, 38, 5, 'add|10000|05QF9T', 1, '2026-06-09 09:44:25', NULL),
(157, 38, 5, 'add|9995|05QF9Z', 1, '2026-06-09 09:44:40', NULL),
(158, 39, 5, 'add|7786|08KHC3', 1, '2026-06-09 09:44:49', NULL),
(159, 40, 5, 'add|6125|08GNTF', 1, '2026-06-09 09:45:01', NULL),
(160, 40, 5, 'add|10000|08GNTG', 1, '2026-06-09 09:45:16', NULL),
(161, 41, 5, 'add|444|08HJJ0', 1, '2026-06-09 09:45:24', NULL),
(162, 41, 5, 'add|3000|08HJIV', 1, '2026-06-09 09:45:33', NULL),
(163, 41, 5, 'add|3000|08HJIX', 1, '2026-06-09 09:45:42', NULL),
(164, 42, 5, 'add|2267|08M90A', 1, '2026-06-09 09:45:55', NULL),
(165, 43, 5, 'add|544|060TD6', 1, '2026-06-09 09:46:28', NULL),
(166, 43, 5, 'add|9995|060TD8', 1, '2026-06-09 09:46:40', NULL),
(167, 54, 5, 'add|1400|08KDMI', 1, '2026-06-09 09:47:05', NULL),
(168, 55, 5, 'add|1000|08DHJ3', 1, '2026-06-09 09:47:22', NULL),
(169, 55, 5, 'add|1000|08DHIU', 1, '2026-06-09 09:47:45', NULL),
(170, 55, 5, 'add|1000|08DHIR', 1, '2026-06-09 09:47:53', NULL),
(171, 55, 5, 'add|1000|08DHJ5', 1, '2026-06-09 09:48:02', NULL),
(172, 55, 5, 'add|1000|08DHJH', 1, '2026-06-09 09:48:11', NULL),
(173, 55, 5, 'add|1000|08DHJC', 1, '2026-06-09 09:48:22', NULL),
(174, 55, 5, 'add|1000|08DHJB', 1, '2026-06-09 09:48:35', NULL),
(175, 55, 5, 'add|1000|08DHJA', 1, '2026-06-09 09:48:49', NULL),
(176, 56, 5, 'add|3000|08KAY5', 1, '2026-06-09 09:49:01', NULL),
(177, 56, 5, 'add|3000|08KAYA', 1, '2026-06-09 09:49:10', NULL),
(178, 57, 5, 'add|10000|08E1ZN', 1, '2026-06-09 09:49:26', NULL),
(179, 57, 5, 'add|10000|08E1YX', 1, '2026-06-09 09:49:34', NULL),
(180, 181, 5, 'add|9990|05M8SP', 1, '2026-06-09 09:49:46', NULL),
(181, 182, 5, 'add|713|08EEVX', 1, '2026-06-09 09:50:01', NULL),
(182, 182, 5, 'add|3000|08EEVZ', 1, '2026-06-09 09:50:11', NULL),
(183, 182, 5, 'add|3000|08EEW0', 1, '2026-06-09 09:50:19', NULL),
(184, 183, 5, 'add|7645|08K37X', 1, '2026-06-09 09:50:31', NULL),
(185, 61, 5, 'add|353|08I3Z7', 1, '2026-06-09 09:50:56', NULL),
(186, 62, 5, 'add|3335|08H8TP', 1, '2026-06-09 09:51:07', NULL),
(187, 64, 5, 'add|2500|05VVL2', 1, '2026-06-09 09:51:27', NULL),
(188, 64, 5, 'add|1348|05VVLP', 1, '2026-06-09 09:51:40', NULL),
(189, 64, 5, 'add|2500|05VVL1', 1, '2026-06-09 09:51:52', NULL),
(190, 64, 5, 'add|2500|05VVLV', 1, '2026-06-09 09:52:03', NULL),
(191, 65, 5, 'add|10000|08FORP', 1, '2026-06-09 09:53:20', NULL),
(192, 65, 5, 'add|10000|08FOQP', 1, '2026-06-09 09:53:32', NULL),
(193, 65, 5, 'add|10000|08FOQM', 1, '2026-06-09 09:53:42', NULL),
(194, 65, 5, 'add|10000|08FOQN', 1, '2026-06-09 09:53:54', NULL),
(195, 65, 5, 'add|10000|08FORR', 1, '2026-06-09 09:54:06', NULL),
(196, 65, 5, 'add|10000|08FORO', 1, '2026-06-09 09:54:18', NULL),
(197, 65, 5, 'add|10000|08FORM', 1, '2026-06-09 09:54:30', NULL),
(198, 65, 5, 'add|10000|08FOQK', 1, '2026-06-09 09:54:51', NULL),
(199, 65, 5, 'add|10000|08FOQL', 1, '2026-06-09 09:55:03', NULL),
(200, 65, 5, 'add|10000|08FOQI', 1, '2026-06-09 09:55:13', NULL),
(201, 65, 5, 'add|10000|08FOQJ', 1, '2026-06-09 09:55:27', NULL),
(202, 65, 5, 'add|7854|08FOQG', 1, '2026-06-09 09:55:38', NULL),
(203, 65, 5, 'add|10000|08FOQH', 1, '2026-06-09 09:55:51', NULL),
(204, 65, 5, 'add|10000|08FOQO', 1, '2026-06-09 09:56:04', NULL),
(205, 66, 5, 'add|2895|08MCMC', 1, '2026-06-09 09:56:12', NULL),
(206, 67, 5, 'add|10000|08MB3J', 1, '2026-06-09 09:56:32', NULL),
(207, 67, 5, 'add|1120|08MB9J', 1, '2026-06-09 09:56:43', NULL),
(208, 67, 5, 'add|10000|08MB3K', 1, '2026-06-09 09:56:54', NULL),
(209, 67, 5, 'add|10000|08MB9E', 1, '2026-06-09 09:57:04', NULL),
(210, 67, 5, 'add|10000|08MB35', 1, '2026-06-09 09:57:13', NULL),
(211, 67, 5, 'add|10000|08MB37', 1, '2026-06-09 09:57:22', NULL),
(212, 67, 5, 'add|10000|08MB3R', 1, '2026-06-09 09:57:30', NULL),
(213, 67, 5, 'add|10000|08MB3O', 1, '2026-06-09 09:57:39', NULL),
(214, 67, 5, 'add|10000|08MB3P', 1, '2026-06-09 09:57:47', NULL),
(215, 67, 5, 'add|10000|08MB3I', 1, '2026-06-09 09:57:55', NULL),
(216, 69, 5, 'add|8353|08J9A8', 1, '2026-06-09 09:58:30', NULL),
(217, 69, 5, 'add|10000|08J9AP', 1, '2026-06-09 09:58:40', NULL),
(218, 69, 5, 'add|10000|08J9A7', 1, '2026-06-09 09:58:51', NULL),
(219, 70, 5, 'add|10000|08B88T', 1, '2026-06-09 09:59:09', NULL),
(220, 70, 5, 'add|10000|08B88F', 1, '2026-06-09 09:59:19', NULL),
(221, 70, 5, 'add|10000|08B88H', 1, '2026-06-09 09:59:35', NULL),
(222, 70, 5, 'add|10000|08B88P', 1, '2026-06-09 09:59:44', NULL),
(223, 71, 5, 'add|281|06Q1LX', 1, '2026-06-09 09:59:58', NULL),
(224, 71, 5, 'add|1387|088HI4', 1, '2026-06-09 10:00:07', NULL),
(225, 71, 5, 'add|3902|084XXJ', 1, '2026-06-09 10:00:18', NULL),
(226, 71, 5, 'add|5000|08HJU7', 1, '2026-06-09 10:00:32', NULL),
(227, 72, 5, 'add|10000|08F06H', 1, '2026-06-09 10:00:48', NULL),
(228, 73, 5, 'add|5657|08CD88', 1, '2026-06-09 10:00:57', NULL),
(229, 75, 5, 'add|10000|08AZJ8', 1, '2026-06-09 10:01:08', NULL),
(230, 75, 5, 'add|10000|08AZJ9', 1, '2026-06-09 10:01:16', NULL),
(231, 76, 5, 'add|10000|08CQPE', 1, '2026-06-09 10:01:26', NULL),
(232, 77, 5, 'add|5000|08GY5H', 1, '2026-06-09 10:01:35', NULL),
(233, 77, 5, 'add|5000|08GY59', 1, '2026-06-09 10:01:43', NULL),
(234, 80, 5, 'add|3387|08LC9B', 1, '2026-06-09 10:01:58', NULL),
(235, 184, 5, 'add|2000|07T13W', 1, '2026-06-09 10:02:30', NULL),
(236, 184, 5, 'add|376|07TMGD', 1, '2026-06-09 10:02:39', NULL),
(237, 185, 5, 'add|10000|08FKX2', 1, '2026-06-09 10:02:53', NULL),
(238, 81, 5, 'add|10000|05QEZO', 1, '2026-06-09 10:03:10', NULL),
(239, 81, 5, 'add|6933|847126231009', 1, '2026-06-09 10:03:27', NULL),
(240, 81, 5, 'add|9995|05QEZM', 1, '2026-06-09 10:03:39', NULL),
(241, 82, 5, 'add|8933|08D32P', 1, '2026-06-09 10:04:06', NULL),
(242, 82, 5, 'add|10000|08D32U', 1, '2026-06-09 10:04:15', NULL),
(243, 82, 5, 'add|10000|08ETY2', 1, '2026-06-09 10:04:25', NULL),
(244, 82, 5, 'add|10000|08ETY3', 1, '2026-06-09 10:04:34', NULL),
(245, 82, 5, 'add|10000|08ETY0', 1, '2026-06-09 10:04:43', NULL),
(246, 82, 5, 'add|10000|08ETY1', 1, '2026-06-09 10:04:51', NULL),
(247, 83, 5, 'add|5351|08D3C4', 1, '2026-06-09 10:05:10', NULL),
(248, 83, 5, 'add|10000|08D3C0', 1, '2026-06-09 10:05:20', NULL),
(249, 83, 5, 'add|10000|08D3BI', 1, '2026-06-09 10:05:29', NULL),
(250, 83, 5, 'add|10000|08D3CA', 1, '2026-06-09 10:05:40', NULL),
(251, 83, 5, 'add|10000|08D3C9', 1, '2026-06-09 10:05:50', NULL),
(252, 83, 5, 'add|10000|08D3B5', 1, '2026-06-09 10:05:59', NULL),
(253, 83, 5, 'add|10000|08D3C1', 1, '2026-06-09 10:06:08', NULL),
(254, 83, 5, 'add|10000|08D3C2', 1, '2026-06-09 10:06:17', NULL),
(255, 83, 5, 'add|10000|08D3B4', 1, '2026-06-09 10:06:27', NULL),
(256, 83, 5, 'add|10000|08D3BZ', 1, '2026-06-09 10:06:36', NULL),
(257, 83, 5, 'add|10000|08D3CC', 1, '2026-06-09 10:06:46', NULL),
(258, 83, 5, 'add|10000|08D3C3', 1, '2026-06-09 10:06:56', NULL),
(259, 83, 5, 'add|10000|08D3CB', 1, '2026-06-09 10:07:06', NULL),
(260, 83, 5, 'add|10000|08D3B6', 1, '2026-06-09 10:07:18', NULL),
(261, 84, 5, 'add|10000|08D6B0', 1, '2026-06-09 10:07:54', NULL),
(262, 84, 5, 'add|10000|08D6CI', 1, '2026-06-09 10:08:04', NULL),
(263, 84, 5, 'add|10000|08D6CJ', 1, '2026-06-09 10:08:22', NULL),
(264, 84, 5, 'add|3504|08D6BS', 1, '2026-06-09 10:08:31', NULL),
(265, 84, 5, 'add|10000|08D6BU', 1, '2026-06-09 10:08:40', NULL),
(266, 84, 5, 'add|6496|08D6B1', 1, '2026-06-09 10:08:54', NULL),
(267, 84, 5, 'add|10000|08D6B8', 1, '2026-06-09 10:09:28', NULL),
(268, 84, 5, 'add|10000|08D6B3', 1, '2026-06-09 10:09:38', NULL),
(269, 85, 5, 'add|10000|086IAT', 1, '2026-06-09 10:10:05', NULL),
(270, 85, 5, 'add|10000|086IAU', 1, '2026-06-09 10:10:14', NULL),
(271, 88, 5, 'add|4000|08B3VX', 1, '2026-06-09 10:10:25', NULL),
(272, 91, 5, 'add|10000|089TR8', 1, '2026-06-09 10:10:38', NULL),
(273, 91, 5, 'add|10000|089TRC', 1, '2026-06-09 10:10:45', NULL),
(274, 86, 5, 'add|4000|085QYM', 1, '2026-06-09 10:10:54', NULL),
(275, 86, 5, 'add|4000|085QYP', 1, '2026-06-09 10:11:02', NULL),
(276, 86, 5, 'add|4000|088BOD', 1, '2026-06-09 10:11:10', NULL),
(277, 89, 5, 'add|4000|086K2G', 1, '2026-06-09 10:11:18', NULL),
(278, 87, 5, 'add|10000|086ID1', 1, '2026-06-09 10:11:35', NULL),
(279, 87, 5, 'add|10000|086ID0', 1, '2026-06-09 10:11:42', NULL),
(280, 90, 5, 'add|10000|086A05', 1, '2026-06-09 10:11:58', NULL),
(281, 90, 5, 'add|10000|086A04', 1, '2026-06-09 10:12:05', NULL),
(282, 94, 5, 'add|10000|086IAJ', 1, '2026-06-09 10:12:41', NULL),
(283, 94, 5, 'add|10000|086IAI', 1, '2026-06-09 10:12:50', NULL),
(284, 95, 5, 'add|10000|083BBI', 1, '2026-06-09 10:13:07', NULL),
(285, 95, 5, 'add|10000|083BBJ', 1, '2026-06-09 10:13:17', NULL),
(286, 96, 5, 'add|5654|086ICJ', 1, '2026-06-09 10:13:30', NULL),
(287, 96, 5, 'add|3994|086ICL', 1, '2026-06-09 10:13:37', NULL),
(288, 97, 5, 'add|6280|07E73Y', 1, '2026-06-09 10:13:49', NULL),
(289, 97, 5, 'add|10000|07E741', 1, '2026-06-09 10:13:58', NULL),
(290, 98, 5, 'add|8622|07E8Y6', 1, '2026-06-09 10:14:11', NULL),
(291, 98, 5, 'add|10000|07E8ZW', 1, '2026-06-09 10:14:20', NULL),
(292, 99, 5, 'add|7228|07E9YR', 1, '2026-06-09 10:14:31', NULL),
(293, 99, 5, 'add|2675|847126231007', 1, '2026-06-09 10:14:40', NULL),
(294, 99, 5, 'add|9990|07E77C', 1, '2026-06-09 10:14:49', NULL),
(295, 100, 5, 'add|535|84712623100C', 1, '2026-06-09 10:15:02', NULL),
(296, 100, 5, 'add|10000|07EAMH', 1, '2026-06-09 10:15:19', NULL),
(297, 100, 5, 'add|10000|07EAMJ', 1, '2026-06-09 10:15:31', NULL),
(298, 100, 5, 'add|10000|07EAMK', 1, '2026-06-09 10:15:43', NULL),
(299, 100, 5, 'add|10000|07EAMI', 1, '2026-06-09 10:15:55', NULL),
(300, 101, 5, 'add|2114|08KDBP', 1, '2026-06-09 10:16:03', NULL),
(301, 101, 5, 'add|10000|08KDC0', 1, '2026-06-09 10:16:11', NULL),
(302, 101, 5, 'add|10000|08KDBZ', 1, '2026-06-09 10:16:21', NULL),
(303, 101, 5, 'add|10000|08KDC1', 1, '2026-06-09 10:16:32', NULL),
(304, 102, 5, 'add|10000|083BM8', 1, '2026-06-09 10:16:48', NULL),
(305, 103, 5, 'add|10000|084DGQ', 1, '2026-06-09 10:17:00', NULL),
(306, 104, 5, 'add|6262|08D5F6', 1, '2026-06-09 10:17:25', NULL),
(307, 104, 5, 'add|10000|08D5F7', 1, '2026-06-09 10:17:36', NULL),
(308, 104, 5, 'add|10000|08D5F8', 1, '2026-06-09 10:17:45', NULL),
(309, 104, 5, 'add|10000|08D5F3', 1, '2026-06-09 10:17:57', NULL),
(310, 107, 5, 'add|10000|08AF69', 1, '2026-06-09 10:18:05', NULL),
(311, 107, 5, 'add|10000|08AF6E', 1, '2026-06-09 10:18:12', NULL),
(312, 105, 5, 'add|10000|083BL4', 1, '2026-06-09 10:18:20', NULL),
(313, 105, 5, 'add|10000|083BL7', 1, '2026-06-09 10:18:28', NULL),
(314, 108, 5, 'add|10000|086IB8', 1, '2026-06-09 10:18:35', NULL),
(315, 108, 5, 'add|10000|086IB7', 1, '2026-06-09 10:18:43', NULL),
(316, 106, 5, 'add|9234|08ARF9', 1, '2026-06-09 10:18:53', NULL),
(317, 106, 5, 'add|10000|08ARFA', 1, '2026-06-09 10:19:01', NULL),
(318, 106, 5, 'add|10000|08ARF7', 1, '2026-06-09 10:19:08', NULL),
(319, 109, 5, 'add|2864|07B5OF', 1, '2026-06-09 10:19:18', NULL),
(320, 112, 5, 'add|3000|08IIQT', 1, '2026-06-09 10:19:27', NULL),
(321, 112, 5, 'add|3000|08IIQU', 1, '2026-06-09 10:19:35', NULL),
(322, 112, 5, 'add|3000|08IIQX', 1, '2026-06-09 10:19:42', NULL),
(323, 112, 5, 'add|3000|08IIQW', 1, '2026-06-09 10:19:49', NULL),
(324, 113, 5, 'add|1528|08DF23', 1, '2026-06-09 10:20:20', NULL),
(325, 113, 5, 'add|3000|08DF2B', 1, '2026-06-09 10:20:31', NULL),
(326, 113, 5, 'add|3000|08DF29', 1, '2026-06-09 10:20:41', NULL),
(327, 113, 5, 'add|3000|08DF24', 1, '2026-06-09 10:20:49', NULL),
(328, 116, 5, 'add|2053|08JO5L', 1, '2026-06-09 10:21:00', NULL),
(329, 116, 5, 'add|4000|08JO5M', 1, '2026-06-09 10:21:09', NULL),
(330, 116, 5, 'add|4000|08JO1Y', 1, '2026-06-09 10:21:18', NULL),
(331, 116, 5, 'add|4000|08JO38', 1, '2026-06-09 10:21:28', NULL),
(332, 116, 5, 'add|4000|08JO1X', 1, '2026-06-09 10:21:36', NULL),
(333, 116, 5, 'add|4000|08JO4A', 1, '2026-06-09 10:21:45', NULL),
(334, 119, 5, 'add|5000|08F329', 1, '2026-06-09 10:22:00', NULL),
(335, 119, 5, 'add|5000|08F32A', 1, '2026-06-09 10:22:26', NULL),
(336, 114, 5, 'add|2170|08E51P', 1, '2026-06-09 10:22:37', NULL),
(337, 117, 5, 'add|1692|089BTZ', 1, '2026-06-09 10:22:55', NULL),
(338, 117, 5, 'add|4000|089BTP', 1, '2026-06-09 10:23:08', NULL),
(339, 117, 5, 'add|4000|089BTC', 1, '2026-06-09 10:23:18', NULL),
(340, 117, 5, 'add|4000|089BTD', 1, '2026-06-09 10:23:27', NULL),
(341, 117, 5, 'add|4000|089BTF', 1, '2026-06-09 10:23:38', NULL),
(342, 117, 5, 'add|4000|089BT9', 1, '2026-06-09 10:23:47', NULL),
(343, 117, 5, 'add|4000|089BTE', 1, '2026-06-09 10:23:57', NULL),
(344, 117, 5, 'add|4000|089BTM', 1, '2026-06-09 10:24:06', NULL),
(345, 117, 5, 'add|4000|089BTN', 1, '2026-06-09 10:24:15', NULL),
(346, 117, 5, 'add|4000|089BTY', 1, '2026-06-09 10:24:23', NULL),
(347, 117, 5, 'add|4000|089BTX', 1, '2026-06-09 10:24:31', NULL),
(348, 117, 5, 'add|4000|089BTA', 1, '2026-06-09 10:24:39', NULL),
(349, 117, 5, 'add|4000|089BTW', 1, '2026-06-09 10:24:49', NULL),
(350, 117, 5, 'add|4000|089BTB', 1, '2026-06-09 10:25:06', NULL),
(351, 118, 5, 'add|178|06ON9S', 1, '2026-06-09 10:26:32', NULL),
(352, 118, 5, 'add|2500|06QG8Y', 1, '2026-06-09 10:26:43', NULL),
(353, 186, 5, 'add|9975|844126120C3A', 1, '2026-06-09 10:27:36', NULL),
(354, 126, 5, 'add|240|07E9TS', 1, '2026-06-09 10:28:34', NULL),
(355, 126, 5, 'add|3995|07EB4U', 1, '2026-06-09 10:28:46', NULL),
(356, 126, 5, 'add|4000|07E9TQ', 1, '2026-06-09 10:28:56', NULL),
(357, 121, 5, 'add|5838|07R7O9', 1, '2026-06-09 10:29:08', NULL),
(358, 121, 5, 'add|10000|07R7OA', 1, '2026-06-09 10:29:16', NULL),
(359, 121, 5, 'add|10000|07R7O8', 1, '2026-06-09 10:29:25', NULL),
(360, 121, 5, 'add|10000|07R7O7', 1, '2026-06-09 10:29:32', NULL),
(361, 121, 5, 'add|10000|07R7OD', 1, '2026-06-09 10:29:40', NULL),
(362, 121, 5, 'add|10000|07R7OE', 1, '2026-06-09 10:29:47', NULL),
(363, 124, 5, 'add|8960|06O8WJ', 1, '2026-06-09 10:29:57', NULL),
(364, 124, 5, 'add|10000|06O8WG', 1, '2026-06-09 10:30:05', NULL),
(365, 124, 5, 'add|10000|06O8WK', 1, '2026-06-09 10:30:13', NULL),
(366, 124, 5, 'add|10000|06O8WN', 1, '2026-06-09 10:30:21', NULL),
(367, 124, 5, 'add|10000|06O8WF', 1, '2026-06-09 10:30:29', NULL),
(368, 124, 5, 'add|10000|06O8WI', 1, '2026-06-09 10:30:37', NULL),
(369, 127, 5, 'add|9230|06OA1L', 1, '2026-06-09 10:30:53', NULL),
(370, 127, 5, 'add|10000|06OA1N', 1, '2026-06-09 10:31:04', NULL),
(371, 127, 5, 'add|10000|06OA1V', 1, '2026-06-09 10:31:13', NULL),
(372, 127, 5, 'add|10000|06OA1X', 1, '2026-06-09 10:31:22', NULL),
(373, 127, 5, 'add|10000|06OA1W', 1, '2026-06-09 10:31:30', NULL),
(374, 127, 5, 'add|10000|06OA1M', 1, '2026-06-09 10:31:51', NULL),
(375, 122, 5, 'add|1136|08127M', 1, '2026-06-09 10:32:01', NULL),
(376, 125, 5, 'add|5374|07SIOQ', 1, '2026-06-09 10:32:12', NULL),
(377, 128, 5, 'add|245|0896YN', 1, '2026-06-09 10:32:18', NULL),
(378, 128, 5, 'add|10000|0896YL', 1, '2026-06-09 10:32:25', NULL),
(379, 128, 5, 'add|10000|0896YM', 1, '2026-06-09 10:32:32', NULL),
(380, 129, 5, 'add|1600|08BLHT', 1, '2026-06-09 10:32:53', NULL),
(381, 129, 5, 'add|10000|084DCY', 1, '2026-06-09 10:33:01', NULL),
(382, 137, 5, 'add|10000|089746', 1, '2026-06-09 10:33:10', NULL),
(383, 132, 5, 'add|8400|08D3AC', 1, '2026-06-09 10:33:21', NULL),
(384, 140, 5, 'add|150|08D90Z', 1, '2026-06-09 10:33:37', NULL),
(385, 133, 5, 'add|10000|086KY4', 1, '2026-06-09 10:33:45', NULL),
(386, 136, 5, 'add|4000|08G79T', 1, '2026-06-09 10:33:56', NULL),
(387, 141, 5, 'add|285|08LC6R', 1, '2026-06-09 10:34:11', NULL),
(388, 141, 5, 'add|3472|087OSS', 1, '2026-06-09 10:34:20', NULL),
(389, 141, 5, 'add|10000|087OST', 1, '2026-06-09 10:34:30', NULL),
(390, 141, 5, 'add|10000|087OSV', 1, '2026-06-09 10:34:38', NULL),
(391, 142, 5, 'add|2110|08GAN9', 1, '2026-06-09 10:34:45', NULL),
(392, 143, 5, 'add|3000|08EL4X', 1, '2026-06-09 10:34:55', NULL),
(393, 143, 5, 'add|3000|08EL4V', 1, '2026-06-09 10:35:02', NULL),
(394, 144, 5, 'add|8080|089U0B', 1, '2026-06-09 10:35:12', NULL),
(395, 144, 5, 'add|10000|089U09', 1, '2026-06-09 10:35:20', NULL),
(396, 144, 5, 'add|10000|089U0A', 1, '2026-06-09 10:35:28', NULL),
(397, 145, 5, 'add|10000|086BD6', 1, '2026-06-09 10:35:57', NULL),
(398, 147, 5, 'add|10000|08C5WH', 1, '2026-06-09 10:36:05', NULL),
(399, 147, 5, 'add|10000|08C5WG', 1, '2026-06-09 10:36:22', NULL),
(400, 147, 5, 'add|10000|08C5WF', 1, '2026-06-09 10:36:29', NULL),
(401, 148, 5, 'add|2130|08EKYL', 1, '2026-06-09 10:36:46', NULL),
(402, 148, 5, 'add|3000|08EKZG', 1, '2026-06-09 10:36:53', NULL),
(403, 148, 5, 'add|3000|08EKZF', 1, '2026-06-09 10:37:02', NULL),
(404, 148, 5, 'add|3000|08EKZH', 1, '2026-06-09 10:37:10', NULL),
(405, 148, 5, 'add|3000|08EKYD', 1, '2026-06-09 10:37:18', NULL),
(406, 148, 5, 'add|3000|08EKYC', 1, '2026-06-09 10:37:27', NULL),
(407, 148, 5, 'add|3000|08EKYN', 1, '2026-06-09 10:37:35', NULL),
(408, 148, 5, 'add|3000|08EKYM', 1, '2026-06-09 10:37:43', NULL),
(409, 148, 5, 'add|3000|08EKYF', 1, '2026-06-09 10:37:51', NULL),
(410, 148, 5, 'add|3000|08EKZC', 1, '2026-06-09 10:37:58', NULL),
(411, 149, 5, 'add|9500|08EU8F', 1, '2026-06-09 10:38:28', NULL),
(412, 149, 5, 'add|10000|08D5G0', 1, '2026-06-09 10:38:39', NULL),
(413, 149, 5, 'add|10000|08EU7P', 1, '2026-06-09 10:38:46', NULL),
(414, 149, 5, 'add|10000|08EU7O', 1, '2026-06-09 10:38:55', NULL),
(415, 149, 5, 'add|10000|08EU86', 1, '2026-06-09 10:39:03', NULL),
(416, 149, 5, 'add|10000|08EU87', 1, '2026-06-09 10:39:12', NULL),
(417, 149, 5, 'add|10000|08EU8E', 1, '2026-06-09 10:39:20', NULL),
(418, 149, 5, 'add|10000|08EU8B', 1, '2026-06-09 10:39:27', NULL),
(419, 149, 5, 'add|10000|08EU8A', 1, '2026-06-09 10:39:36', NULL),
(420, 149, 5, 'add|10000|08EU8C', 1, '2026-06-09 10:39:44', NULL),
(421, 150, 5, 'add|10000|08F0AS', 1, '2026-06-09 10:40:04', NULL),
(422, 150, 5, 'add|10000|08F0AW', 1, '2026-06-09 10:40:11', NULL),
(423, 150, 5, 'add|10000|08F0AX', 1, '2026-06-09 10:40:18', NULL),
(424, 150, 5, 'add|8885|08F0AZ', 1, '2026-06-09 10:40:27', NULL),
(425, 151, 5, 'add|3980|08H99S', 1, '2026-06-09 10:40:47', NULL),
(426, 151, 5, 'add|10000|08GZ37', 1, '2026-06-09 10:40:55', NULL),
(427, 151, 5, 'add|10000|08GZ38', 1, '2026-06-09 10:41:03', NULL),
(428, 151, 5, 'add|10000|08GZ2T', 1, '2026-06-09 10:41:11', NULL),
(429, 151, 5, 'add|10000|08H990', 1, '2026-06-09 10:41:18', NULL),
(430, 151, 5, 'add|10000|08H99O', 1, '2026-06-09 10:41:35', NULL),
(431, 151, 5, 'add|10000|08GZ2P', 1, '2026-06-09 10:41:43', NULL),
(432, 151, 5, 'add|10000|08GZ2N', 1, '2026-06-09 10:41:50', NULL),
(433, 151, 5, 'add|10000|08H99Q', 1, '2026-06-09 10:41:58', NULL),
(434, 151, 5, 'add|10000|08H994', 1, '2026-06-09 10:42:06', NULL),
(435, 151, 5, 'add|10000|08GZ2O', 1, '2026-06-09 10:42:13', NULL),
(436, 152, 5, 'add|7434|08A6FE', 1, '2026-06-09 10:42:42', NULL),
(437, 152, 5, 'add|10000|08A6GO', 1, '2026-06-09 10:42:51', NULL),
(438, 152, 5, 'add|10000|08A6GM', 1, '2026-06-09 10:43:00', NULL),
(439, 152, 5, 'add|10000|08A6GK', 1, '2026-06-09 10:43:09', NULL),
(440, 152, 5, 'add|10000|08A6GH', 1, '2026-06-09 10:43:19', NULL),
(441, 152, 5, 'add|10000|08A6GG', 1, '2026-06-09 10:43:29', NULL),
(442, 152, 5, 'add|10000|08A6GL', 1, '2026-06-09 10:43:38', NULL),
(443, 152, 5, 'add|10000|08A6GF', 1, '2026-06-09 10:43:49', NULL),
(444, 152, 5, 'add|10000|08A6GI', 1, '2026-06-09 10:43:58', NULL),
(445, 152, 5, 'add|10000|08A6GJ', 1, '2026-06-09 10:44:08', NULL),
(446, 152, 5, 'add|10000|08A6FT', 1, '2026-06-09 10:44:17', NULL),
(447, 153, 5, 'add|10000|08ARGW', 1, '2026-06-09 10:44:56', NULL),
(448, 153, 5, 'add|10000|08C665', 1, '2026-06-09 10:45:11', NULL),
(449, 153, 5, 'add|10000|08C664', 1, '2026-06-09 10:45:21', NULL),
(450, 155, 5, 'add|10000|08ARBM', 1, '2026-06-09 10:45:47', NULL),
(451, 155, 5, 'add|10000|08ARBR', 1, '2026-06-09 10:45:55', NULL),
(452, 155, 5, 'add|10000|08ARBJ', 1, '2026-06-09 10:46:06', NULL),
(453, 155, 5, 'add|10000|08ARBL', 1, '2026-06-09 10:46:18', NULL),
(454, 155, 5, 'add|10000|08ARBK', 1, '2026-06-09 10:46:27', NULL),
(455, 154, 5, 'add|1843|05ON39', 1, '2026-06-09 10:46:50', NULL),
(456, 154, 5, 'add|10000|05ON38', 1, '2026-06-09 10:47:02', NULL),
(457, 154, 5, 'add|10000|05ON34', 1, '2026-06-09 10:47:14', NULL),
(458, 154, 5, 'add|10000|05ON33', 1, '2026-06-09 10:47:25', NULL),
(459, 154, 5, 'add|10000|05ON4K', 1, '2026-06-09 10:47:36', NULL),
(460, 154, 5, 'add|10000|05ON4G', 1, '2026-06-09 10:47:49', NULL),
(461, 154, 5, 'add|10000|05ON37', 1, '2026-06-09 10:48:01', NULL),
(462, 156, 5, 'add|10000|08C5XY', 1, '2026-06-09 10:48:09', NULL),
(463, 156, 5, 'add|10000|08C5XX', 1, '2026-06-09 10:48:16', NULL),
(464, 159, 5, 'add|100|08FK9S', 1, '2026-06-09 10:48:48', NULL),
(465, 161, 5, 'add|2155|08GIWQ', 1, '2026-06-09 10:48:56', NULL),
(466, 162, 5, 'add|1000|08F38O', 1, '2026-06-09 10:49:26', NULL),
(467, 162, 5, 'add|1000|08F38L', 1, '2026-06-09 10:49:35', NULL),
(468, 162, 5, 'add|1000|08F38N', 1, '2026-06-09 10:49:43', NULL),
(469, 162, 5, 'add|1000|08F38P', 1, '2026-06-09 10:49:52', NULL),
(470, 163, 5, 'add|1000|08FVSP', 1, '2026-06-09 10:50:13', NULL),
(471, 163, 5, 'add|1000|08FVSM', 1, '2026-06-09 10:50:21', NULL),
(472, 163, 5, 'add|1000|08FVVH', 1, '2026-06-09 10:50:35', NULL),
(473, 163, 5, 'add|1000|08FVW5', 1, '2026-06-09 10:50:45', NULL),
(474, 166, 5, 'add|6000|08K3XO', 1, '2026-06-09 10:51:15', NULL),
(475, 167, 5, 'add|6000|08K3XW', 1, '2026-06-09 10:51:24', NULL),
(476, 169, 5, 'add|181|08I3I5', 1, '2026-06-09 10:51:42', NULL),
(477, 170, 5, 'add|750|08EEHM', 1, '2026-06-09 10:52:06', NULL),
(478, 170, 5, 'add|975|08EEHJ', 1, '2026-06-09 10:52:15', NULL),
(479, 170, 5, 'add|975|08EEH9', 1, '2026-06-09 10:52:24', NULL),
(480, 170, 5, 'add|975|08EEH7', 1, '2026-06-09 10:52:32', NULL),
(481, 171, 5, 'add|153|08DUGP', 1, '2026-06-09 10:52:49', NULL),
(482, 171, 5, 'add|300|08DUGR', 1, '2026-06-09 10:53:13', NULL),
(483, 171, 5, 'add|300|08DUGQ', 1, '2026-06-09 10:53:21', NULL),
(484, 103, 5, 'add|10000|084DGW', 1, '2026-06-09 10:53:51', NULL),
(485, 158, 5, 'add|3000|08COSP', 3000, '2026-06-09 10:54:54', NULL),
(486, 157, 5, 'add|3000|08DPR2', 3000, '2026-06-09 10:55:26', NULL),
(487, 174, 5, 'add|500|08BRC5', 500, '2026-06-09 10:55:40', NULL),
(488, 174, 5, 'add|500|08BRC6', 500, '2026-06-09 10:55:54', NULL),
(489, 164, 7, 'add|396|08BXCF', 1, '2026-06-09 10:57:37', NULL),
(490, 172, 7, 'add|36|08AM1L', 1, '2026-06-09 10:57:50', NULL),
(491, 172, 7, 'add|480|08AM1T', 1, '2026-06-09 10:58:01', NULL),
(492, 173, 7, 'add|1440|08I3TZ', 1, '2026-06-09 10:58:14', NULL),
(493, 59, 7, 'add|480|08J5UU', 1, '2026-06-09 10:58:31', NULL),
(494, 59, 7, 'add|288|08J6BE', 1, '2026-06-09 10:58:40', NULL),
(495, 59, 7, 'add|540|08J5WX', 1, '2026-06-09 10:58:53', NULL),
(496, 59, 7, 'add|522|08J5UX', 1, '2026-06-09 10:59:05', NULL),
(497, 59, 7, 'add|540|08J5WY', 1, '2026-06-09 10:59:14', NULL),
(498, 59, 7, 'add|477|08J5UY', 1, '2026-06-09 10:59:23', NULL),
(499, 59, 7, 'add|540|08J5X4', 1, '2026-06-09 10:59:30', NULL),
(500, 56, 12, 'picklist_issue|3000|08KAYA', 1, '2026-06-09 12:27:49', '[Picklist: MPL26240479] Operator: 088886'),
(501, 56, 12, 'picklist_issue|3000|08KAY5', 1, '2026-06-09 12:27:52', '[Picklist: MPL26240479] Operator: 088886'),
(502, 55, 12, 'picklist_issue|1000|08DHJA', 1, '2026-06-09 12:28:08', '[Picklist: MPL26240479] Operator: 088886'),
(503, 55, 12, 'picklist_issue|1000|08DHJB', 1, '2026-06-09 12:28:11', '[Picklist: MPL26240479] Operator: 088886'),
(504, 19, 10, 'res_receive|10000|08E1OP', 10000, '2026-06-09 13:14:23', '[RES: 0017508305]'),
(505, 66, 10, 'res_receive|10000|08MCMH', 10000, '2026-06-09 13:14:52', '[RES: 0017508305]'),
(506, 66, 10, 'res_receive|10000|08MCMI', 10000, '2026-06-09 13:15:07', '[RES: 0017508305]'),
(507, 80, 10, 'res_receive|10000|08LC9A', 10000, '2026-06-09 13:16:09', '[RES: 0017508305]'),
(508, 54, 10, 'res_receive|2000|08KDMH', 2000, '2026-06-09 13:23:04', '[RES: 0017508305]'),
(509, 54, 10, 'res_receive|2000|08KDMJ', 2000, '2026-06-09 13:23:19', '[RES: 0017508305]'),
(510, 8, 10, 'res_receive|2000|08B94A', 2000, '2026-06-09 13:23:41', '[RES: 0017508305]'),
(511, 8, 10, 'res_receive|2000|08B94B', 2000, '2026-06-09 13:23:54', '[RES: 0017508305]'),
(512, 173, 10, 'res_receive|1440|08I3U6', 1440, '2026-06-09 13:24:34', '[RES: 0017508305]'),
(513, 173, 10, 'res_receive|1440|08I3XA', 1440, '2026-06-09 13:24:45', '[RES: 0017508305]'),
(514, 173, 10, 'res_receive|1440|08I3UF', 1440, '2026-06-09 13:24:56', '[RES: 0017508305]'),
(515, 30, 10, 'res_receive|4000|08E0KC', 4000, '2026-06-09 13:51:25', '[RES: 0017508317]'),
(516, 30, 10, 'res_receive|4000|08E0KD', 4000, '2026-06-09 13:51:39', '[RES: 0017508317]'),
(517, 30, 10, 'res_receive|4000|08E0KE', 4000, '2026-06-09 13:52:00', '[RES: 0017508317]'),
(518, 30, 10, 'res_receive|4000|08E0KF', 4000, '2026-06-09 13:52:19', '[RES: 0017508317]'),
(519, 30, 10, 'res_receive|4000|08E0KV', 4000, '2026-06-09 13:52:36', '[RES: 0017508317]'),
(520, 30, 10, 'res_receive|4000|08E0KG', 4000, '2026-06-09 13:54:08', '[RES: 0017508317]'),
(521, 30, 10, 'res_receive|4000|08E0JR', 4000, '2026-06-09 13:55:37', '[RES: 0017508317]'),
(522, 30, 10, 'res_receive|4000|08E0JP', 4000, '2026-06-09 13:56:06', '[RES: 0017508317]'),
(523, 30, 10, 'res_receive|4000|08E0J1', 4000, '2026-06-09 13:56:19', '[RES: 0017508317]'),
(524, 30, 10, 'res_receive|4000|08E0J2', 4000, '2026-06-09 13:56:35', '[RES: 0017508317]'),
(525, 30, 10, 'res_receive|4000|08E0IY', 4000, '2026-06-09 13:56:59', '[RES: 0017508317]'),
(526, 30, 10, 'res_receive|4000|08E0IZ', 4000, '2026-06-09 13:57:13', '[RES: 0017508317]'),
(527, 30, 10, 'res_receive|4000|08E0J0', 4000, '2026-06-09 13:57:26', '[RES: 0017508317]'),
(528, 30, 10, 'res_receive|4000|08E0JZ', 4000, '2026-06-09 13:57:38', '[RES: 0017508317]'),
(529, 30, 10, 'res_receive|4000|08E0K0', 4000, '2026-06-09 13:57:50', '[RES: 0017508317]'),
(530, 30, 10, 'res_receive|4000|08E0K1', 4000, '2026-06-09 13:59:08', '[RES: 0017508317]'),
(531, 30, 10, 'res_receive|4000|08E0KR', 4000, '2026-06-09 13:59:20', '[RES: 0017508317]'),
(532, 30, 10, 'res_receive|4000|08E0KS', 4000, '2026-06-09 13:59:32', '[RES: 0017508317]'),
(533, 30, 10, 'res_receive|4000|08E0KT', 4000, '2026-06-09 13:59:46', '[RES: 0017508317]'),
(534, 30, 10, 'res_receive|4000|08E0KU', 4000, '2026-06-09 14:00:01', '[RES: 0017508317]'),
(535, 30, 10, 'res_receive|4000|08E0JQ', 4000, '2026-06-09 14:00:15', '[RES: 0017508317]'),
(536, 30, 10, 'res_receive|4000|08E0JO', 4000, '2026-06-09 14:00:28', '[RES: 0017508317]'),
(537, 30, 10, 'res_receive|4000|08E0JN', 4000, '2026-06-09 14:00:44', '[RES: 0017508317]'),
(538, 30, 10, 'res_receive|4000|08E0JX', 4000, '2026-06-09 14:00:56', '[RES: 0017508317]'),
(539, 30, 10, 'res_receive|4000|08E0JY', 4000, '2026-06-09 14:01:08', '[RES: 0017508317]'),
(540, 56, 10, 'res_receive|3000|08MCIJ', 3000, '2026-06-09 14:02:13', '[RES: 0017508341]'),
(541, 56, 10, 'picklist_issue|3000|08MCIJ', 1, '2026-06-09 14:02:24', '[Picklist: MPL26240479] Operator: 086138'),
(542, 174, 10, 'picklist_issue|500|08BRC6', 1, '2026-06-09 16:08:25', '[Picklist: MPL26240536] Operator: 086138'),
(543, 174, 10, 'picklist_issue|500|08BRC5', 1, '2026-06-09 16:08:31', '[Picklist: MPL26240536] Operator: 086138'),
(544, 174, 10, 'picklist_issue|500|08BREM', 1, '2026-06-09 16:08:37', '[Picklist: MPL26240536] Operator: 086138'),
(545, 174, 10, 'picklist_issue|500|08BRE8', 1, '2026-06-09 16:08:44', '[Picklist: MPL26240536] Operator: 086138'),
(546, 174, 10, 'picklist_issue|500|08BRE7', 1, '2026-06-09 16:08:50', '[Picklist: MPL26240536] Operator: 086138'),
(547, 174, 10, 'picklist_issue|500|08BREA', 1, '2026-06-09 16:08:55', '[Picklist: MPL26240536] Operator: 086138'),
(548, 174, 10, 'picklist_issue|500|08BRE9', 1, '2026-06-09 16:09:54', '[Picklist: MPL26240536] Operator: 086138'),
(549, 174, 10, 'picklist_issue|500|08BRC3', 1, '2026-06-09 16:09:57', '[Picklist: MPL26240536] Operator: 086138'),
(550, 185, 10, 'picklist_issue|10000|08FKX2', 1, '2026-06-09 16:10:01', '[Picklist: MPL26240536] Operator: 086138'),
(551, 143, 10, 'picklist_issue|3000|08EL4V', 1, '2026-06-09 16:10:03', '[Picklist: MPL26240536] Operator: 086138'),
(552, 163, 10, 'picklist_issue|1000|08FVW5', 1, '2026-06-09 16:10:19', '[Picklist: MPL26240536] Operator: 086138'),
(553, 163, 10, 'picklist_issue|1000|08FVVH', 1, '2026-06-09 16:10:23', '[Picklist: MPL26240536] Operator: 086138'),
(554, 163, 10, 'picklist_issue|1000|08FVSM', 1, '2026-06-09 16:10:27', '[Picklist: MPL26240536] Operator: 086138'),
(555, 162, 10, 'picklist_issue|1000|08F38P', 1, '2026-06-09 16:10:34', '[Picklist: MPL26240536] Operator: 086138'),
(556, 162, 10, 'picklist_issue|1000|08F38N', 1, '2026-06-09 16:10:38', '[Picklist: MPL26240536] Operator: 086138'),
(557, 162, 10, 'picklist_issue|1000|08F38L', 1, '2026-06-09 16:10:41', '[Picklist: MPL26240536] Operator: 086138'),
(558, 162, 8, 'picklist_issue|1000|08F38O', 1, '2026-06-10 00:23:55', '[Picklist: MPL26240601] Operator: 083754'),
(559, 163, 8, 'picklist_issue|1000|08FVSP', 1, '2026-06-10 00:23:58', '[Picklist: MPL26240601] Operator: 083754'),
(560, 176, 8, 'picklist_issue|500|08KNHB', 1, '2026-06-10 00:24:07', '[Picklist: MPL26240602] Operator: 083754'),
(561, 31, 8, 'picklist_issue|9190|08D5VI', 1, '2026-06-10 00:36:17', '[Picklist: CPL26240066] Operator: 083754'),
(562, 148, 8, 'picklist_issue|2130|08EKYL', 1, '2026-06-10 00:36:41', '[Picklist: CPL26240066] Operator: 083754'),
(563, 83, 8, 'picklist_issue|5351|08D3C4', 1, '2026-06-10 00:36:44', '[Picklist: CPL26240066] Operator: 083754'),
(564, 82, 8, 'picklist_issue|8933|08D32P', 1, '2026-06-10 00:37:41', '[Picklist: CPL26240066] Operator: 083754'),
(565, 84, 8, 'picklist_issue|6510|08D6B1', 1, '2026-06-10 00:37:46', '[Picklist: CPL26240066] Operator: 083754'),
(566, 19, 8, 'picklist_issue|3359|08E1OQ', 1, '2026-06-10 00:37:48', '[Picklist: CPL26240066] Operator: 083754'),
(567, 80, 8, 'picklist_issue|3387|08LC9B', 1, '2026-06-10 00:37:51', '[Picklist: CPL26240066] Operator: 083754'),
(568, 150, 8, 'picklist_issue|8885|08F0AZ', 1, '2026-06-10 00:37:53', '[Picklist: CPL26240066] Operator: 083754'),
(569, 116, 8, 'picklist_issue|2053|08JO5L', 1, '2026-06-10 00:37:55', '[Picklist: CPL26240066] Operator: 083754'),
(570, 69, 8, 'picklist_issue|8353|08J9A8', 1, '2026-06-10 00:38:13', '[Picklist: CPL26240066] Operator: 083754'),
(571, 66, 8, 'picklist_issue|2895|08MCMC', 1, '2026-06-10 00:38:15', '[Picklist: CPL26240066] Operator: 083754'),
(572, 151, 8, 'picklist_issue|3980|08H99S', 1, '2026-06-10 00:38:20', '[Picklist: CPL26240066] Operator: 083754'),
(573, 177, 8, 'picklist_issue|1214|05NEN9', 1, '2026-06-10 00:38:28', '[Picklist: CPL26240066] Operator: 083754'),
(574, 101, 8, 'picklist_issue|2114|08KDBP', 1, '2026-06-10 00:38:35', '[Picklist: CPL26240066] Operator: 083754'),
(575, 144, 8, 'picklist_issue|8080|089U0B', 1, '2026-06-10 00:38:38', '[Picklist: CPL26240066] Operator: 083754'),
(576, 104, 8, 'picklist_issue|6262|08D5F6', 1, '2026-06-10 00:38:40', '[Picklist: CPL26240066] Operator: 083754'),
(577, 32, 8, 'picklist_issue|3845|08ARDF', 1, '2026-06-10 00:38:47', '[Picklist: CPL26240066] Operator: 083754'),
(578, 65, 8, 'picklist_issue|7854|08FOQG', 1, '2026-06-10 00:38:49', '[Picklist: CPL26240066] Operator: 083754'),
(579, 11, 8, 'picklist_issue|1220|08EAQ3', 1, '2026-06-10 00:38:52', '[Picklist: CPL26240066] Operator: 083754'),
(580, 132, 8, 'picklist_issue|8400|08D3AC', 1, '2026-06-10 00:38:54', '[Picklist: CPL26240066] Operator: 083754'),
(581, 106, 8, 'picklist_issue|9234|08ARF9', 1, '2026-06-10 00:38:56', '[Picklist: CPL26240066] Operator: 083754'),
(582, 54, 8, 'picklist_issue|1400|08KDMI', 1, '2026-06-10 00:39:04', '[Picklist: CPL26240066] Operator: 083754'),
(583, 62, 8, 'picklist_issue|3335|08H8TP', 1, '2026-06-10 00:39:09', '[Picklist: CPL26240066] Operator: 083754'),
(584, 9, 8, 'picklist_issue|4885|08BV7U', 1, '2026-06-10 00:39:15', '[Picklist: CPL26240066] Operator: 083754'),
(585, 8, 8, 'picklist_issue|1542|08B949', 1, '2026-06-10 00:39:20', '[Picklist: CPL26240066] Operator: 083754'),
(586, 10, 8, 'picklist_issue|5595|08J9DI', 1, '2026-06-10 00:39:25', '[Picklist: CPL26240066] Operator: 083754'),
(587, 149, 8, 'picklist_issue|10000|08D5G0', 1, '2026-06-10 00:44:29', '[Picklist: CPL26240066] Operator: 083754'),
(588, 33, 8, 'picklist_issue|3000|088B5U', 1, '2026-06-10 00:45:20', '[Picklist: CPL26240066] Operator: 083754'),
(589, 59, 8, 'booking_out_STORE|540|08J5X4', 1, '2026-06-10 01:24:08', '[BookingOut → STORE] Operator: 083754'),
(590, 59, 8, 'booking_out_STORE|477|08J5UY', 1, '2026-06-10 01:24:18', '[BookingOut → STORE] Operator: 083754'),
(591, 59, 8, 'booking_out_STORE|522|08J5UX', 1, '2026-06-10 01:24:33', '[BookingOut → STORE] Operator: 083754'),
(592, 59, 8, 'booking_out_STORE|540|08J5WX', 1, '2026-06-10 01:24:44', '[BookingOut → STORE] Operator: 083754'),
(593, 59, 8, 'booking_out_STORE|540|08J5WY', 1, '2026-06-10 01:25:03', '[BookingOut → STORE] Operator: 083754'),
(594, 59, 8, 'booking_out_STORE|288|08J6BE', 1, '2026-06-10 01:25:16', '[BookingOut → STORE] Operator: 083754'),
(595, 173, 8, 'add|1440|847126241013', 1, '2026-06-10 03:18:38', NULL),
(596, 67, 8, 'picklist_issue|1120|08MB9J', 1, '2026-06-10 03:24:57', '[Picklist: MPL26240656] Operator: 083754'),
(597, 177, 8, 'picklist_issue|3124|05NEOF', 1, '2026-06-10 03:24:59', '[Picklist: MPL26240656] Operator: 083754'),
(598, 33, 8, 'picklist_issue|529|08D5J6', 1, '2026-06-10 03:25:01', '[Picklist: MPL26240656] Operator: 083754'),
(599, 151, 8, 'picklist_issue|10000|08H994', 1, '2026-06-10 03:43:20', '[Picklist: MPL26240658] Operator: 083754'),
(600, 151, 8, 'add|10000|08H994', 1, '2026-06-10 03:43:46', NULL),
(601, 151, 8, 'picklist_issue|10000|08GZ2O', 1, '2026-06-10 03:45:02', '[Picklist: MPL26240659] Operator: 083754'),
(602, 151, 8, 'picklist_issue|10000|08H994', 1, '2026-06-10 03:45:04', '[Picklist: MPL26240659] Operator: 083754'),
(603, 151, 8, 'add|10000|08GZ2O', 1, '2026-06-10 03:45:21', NULL),
(604, 151, 8, 'add|10000|08H994', 1, '2026-06-10 03:45:31', NULL),
(605, 177, 8, 'res_receive|10000|08CBTV', 10000, '2026-06-10 04:04:11', '[RES: 0017508762]'),
(606, 177, 8, 'picklist_issue|10000|05NEOD', 1, '2026-06-10 04:05:16', '[Picklist: MPL26240661] Operator: 083754'),
(607, 177, 8, 'add|10000|05NEOD', 1, '2026-06-10 04:05:31', NULL),
(608, 54, 8, 'res_receive|2000|08KDK8', 2000, '2026-06-10 04:07:30', '[RES: 0017508708]'),
(609, 54, 8, 'add|2000|08KDK7', 1, '2026-06-10 04:08:22', NULL),
(610, 54, 8, 'add|2000|08KDK0', 1, '2026-06-10 04:08:31', NULL),
(611, 54, 8, 'add|2000|08KDJX', 1, '2026-06-10 04:08:46', NULL),
(612, 54, 8, 'add|2000|08KDJY', 1, '2026-06-10 04:08:56', NULL),
(613, 132, 8, 'add|10000|08D3AD', 1, '2026-06-10 04:09:23', NULL),
(614, 18, 8, 'add|10000|08DNS9', 1, '2026-06-10 04:09:43', NULL),
(615, 19, 8, 'add|10000|08E1ON', 1, '2026-06-10 04:10:03', NULL),
(616, 18, 8, 'add|10000|08DNSA', 1, '2026-06-10 04:10:23', NULL),
(617, 19, 8, 'add|10000|08E1OO', 1, '2026-06-10 04:10:41', NULL),
(618, 66, 8, 'add|10000|08MCME', 1, '2026-06-10 04:11:01', NULL),
(619, 66, 8, 'add|10000|08MCMD', 1, '2026-06-10 04:11:21', NULL),
(620, 80, 8, 'add|10000|08LC98', 1, '2026-06-10 04:11:35', NULL),
(621, 80, 8, 'add|10000|08LC99', 1, '2026-06-10 04:11:44', NULL),
(622, 8, 8, 'add|2000|08B948', 1, '2026-06-10 04:13:16', NULL),
(623, 8, 8, 'add|2000|08B94C', 1, '2026-06-10 04:13:25', NULL),
(624, 8, 8, 'add|2000|08B95R', 1, '2026-06-10 04:13:32', NULL),
(625, 8, 8, 'add|2000|08B95S', 1, '2026-06-10 04:13:41', NULL),
(626, 8, 8, 'add|2000|08B95Z', 1, '2026-06-10 04:13:50', NULL),
(627, 173, 8, 'res_receive|1440|08I3U8', 1440, '2026-06-10 04:17:56', '[RES: 0017508709]'),
(628, 173, 8, 'res_receive|1440|08I3UH', 1440, '2026-06-10 04:18:10', '[RES: 0017508709]'),
(629, 173, 8, 'res_receive|1440|08I3UG', 1440, '2026-06-10 04:18:23', '[RES: 0017508709]'),
(630, 67, 8, 'picklist_issue|10000|08MB35', 1, '2026-06-10 05:30:50', '[Picklist: MPL26240687] Operator: 083754'),
(631, 32, 8, 'picklist_issue|10000|08CR7Y', 1, '2026-06-10 05:30:53', '[Picklist: MPL26240687] Operator: 083754'),
(632, 101, 8, 'picklist_issue|10000|08KDC1', 1, '2026-06-10 05:31:19', '[Picklist: MPL26240687] Operator: 083754'),
(633, 66, 8, 'picklist_issue|10000|08MCMI', 1, '2026-06-10 05:31:21', '[Picklist: MPL26240687] Operator: 083754'),
(634, 18, 8, 'picklist_issue|10000|08DNS8', 1, '2026-06-10 05:31:23', '[Picklist: MPL26240687] Operator: 083754'),
(635, 151, 8, 'picklist_issue|10000|08H994', 1, '2026-06-10 05:31:48', '[Picklist: MPL26240687] Operator: 083754'),
(636, 11, 8, 'picklist_issue|10000|08EAPZ', 1, '2026-06-10 05:31:51', '[Picklist: MPL26240687] Operator: 083754'),
(637, 65, 8, 'picklist_issue|10000|08FORP', 1, '2026-06-10 05:31:52', '[Picklist: MPL26240687] Operator: 083754'),
(638, 8, 8, 'picklist_issue|2000|08B94B', 1, '2026-06-10 05:32:14', '[Picklist: MPL26240687] Operator: 083754'),
(639, 54, 8, 'picklist_issue|2000|08KDMJ', 1, '2026-06-10 05:32:16', '[Picklist: MPL26240687] Operator: 083754'),
(640, 9, 8, 'picklist_issue|6000|08BV7W', 1, '2026-06-10 05:32:20', '[Picklist: MPL26240687] Operator: 083754'),
(641, 116, 8, 'picklist_issue|4000|08JO4A', 1, '2026-06-10 10:04:56', '[Picklist: MPL26240753] Operator: 083754'),
(642, 148, 8, 'picklist_issue|3000|08EKYF', 1, '2026-06-10 10:05:07', '[Picklist: MPL26240753] Operator: 083754'),
(643, 177, 8, 'picklist_issue|10000|05NEOD', 1, '2026-06-10 10:30:41', '[Picklist: MPL26240662] Operator: 083754'),
(644, 177, 8, 'add|10000|05NEOD', 1, '2026-06-10 10:31:08', NULL),
(645, 22, 8, 'res_receive|10000|08DVUO', 10000, '2026-06-10 10:31:36', '[RES: 0017508753]'),
(646, 62, 8, 'res_receive|5000|08H8TO', 5000, '2026-06-10 10:31:48', '[RES: 0017508753]'),
(647, 67, 10, 'picklist_issue|10000|08MB3J', 1, '2026-06-10 13:04:14', '[Picklist: MPL26240775] Operator: 086138'),
(648, 67, 10, 'picklist_issue|10000|08MB3P', 1, '2026-06-10 13:04:31', '[Picklist: MPL26240775] Operator: 086138'),
(649, 33, 10, 'picklist_issue|3000|08D5J9', 1, '2026-06-10 13:04:44', '[Picklist: MPL26240775] Operator: 086138'),
(650, 104, 10, 'picklist_issue|10000|08D5F3', 1, '2026-06-10 13:05:03', '[Picklist: MPL26240775] Operator: 086138'),
(651, 31, 10, 'picklist_issue|10000|08D5RW', 1, '2026-06-10 13:05:14', '[Picklist: MPL26240775] Operator: 086138'),
(652, 83, 10, 'picklist_issue|10000|08D3B4', 1, '2026-06-10 13:06:10', '[Picklist: MPL26240775] Operator: 086138'),
(653, 82, 10, 'picklist_issue|10000|08D32U', 1, '2026-06-10 13:06:59', '[Picklist: MPL26240775] Operator: 086138'),
(654, 82, 10, 'picklist_issue|10000|08ETY2', 1, '2026-06-10 13:08:27', '[Picklist: MPL26240775] Operator: 086138'),
(655, 149, 10, 'picklist_issue|10000|08EU86', 1, '2026-06-10 13:08:46', '[Picklist: MPL26240775] Operator: 086138'),
(656, 65, 10, 'picklist_issue|10000|08FOQN', 1, '2026-06-10 13:08:59', '[Picklist: MPL26240775] Operator: 086138'),
(657, 65, 10, 'picklist_issue|10000|08FOQM', 1, '2026-06-10 13:09:19', '[Picklist: MPL26240775] Operator: 086138'),
(658, 65, 10, 'picklist_issue|10000|08FOQP', 1, '2026-06-10 13:09:27', '[Picklist: MPL26240775] Operator: 086138'),
(659, 151, 10, 'picklist_issue|10000|08GZ2O', 1, '2026-06-10 13:09:45', '[Picklist: MPL26240775] Operator: 086138'),
(660, 8, 10, 'picklist_issue|2000|08B94A', 1, '2026-06-10 13:10:11', '[Picklist: MPL26240775] Operator: 086138'),
(661, 177, 10, 'picklist_issue|10000|05NELJ', 1, '2026-06-10 13:10:57', '[Picklist: MPL26240775] Operator: 086138'),
(662, 19, 10, 'picklist_issue|10000|08E1OO', 1, '2026-06-10 13:12:56', '[Picklist: MPL26240775] Operator: 086138'),
(663, 11, 10, 'picklist_issue|10000|08EAQ1', 1, '2026-06-10 13:13:15', '[Picklist: MPL26240775] Operator: 086138'),
(664, 116, 10, 'picklist_issue|4000|08JO1X', 1, '2026-06-10 13:13:28', '[Picklist: MPL26240775] Operator: 086138'),
(665, 148, 10, 'picklist_issue|3000|08EKYM', 1, '2026-06-10 13:13:41', '[Picklist: MPL26240775] Operator: 086138'),
(666, 80, 10, 'picklist_issue|10000|08LC9A', 1, '2026-06-10 13:14:34', '[Picklist: MPL26240775] Operator: 086138'),
(667, 8, 10, 'picklist_issue|2000|08B95Z', 1, '2026-06-10 13:17:02', '[Picklist: MPL26240775] Operator: 086138'),
(668, 150, 10, 'picklist_issue|10000|08F0AW', 1, '2026-06-10 13:17:24', '[Picklist: MPL26240775] Operator: 086138'),
(669, 54, 10, 'picklist_issue|2000|08KDK0', 1, '2026-06-10 13:17:40', '[Picklist: MPL26240775] Operator: 086138'),
(670, 54, 10, 'picklist_issue|2000|08KDK7', 1, '2026-06-10 13:17:50', '[Picklist: MPL26240775] Operator: 086138'),
(671, 10, 10, 'picklist_issue|6000|08J9CX', 1, '2026-06-10 13:18:29', '[Picklist: MPL26240775] Operator: 086138'),
(672, 9, 10, 'picklist_issue|6000|08BV7R', 1, '2026-06-10 13:18:46', '[Picklist: MPL26240775] Operator: 086138'),
(673, 62, 10, 'picklist_issue|5000|08H8TO', 1, '2026-06-10 13:19:02', '[Picklist: MPL26240775] Operator: 086138'),
(674, 66, 10, 'picklist_issue|10000|08MCME', 1, '2026-06-10 13:20:10', '[Picklist: MPL26240775] Operator: 086138'),
(675, 173, 10, 'res_receive|1440|08I3TL', 1440, '2026-06-10 13:45:24', '[RES: 0017509854]'),
(676, 173, 10, 'res_receive|1440|08I3U9', 1440, '2026-06-10 13:45:35', '[RES: 0017509854]'),
(677, 66, 10, 'res_receive|10000|08MCMG', 10000, '2026-06-10 13:45:46', '[RES: 0017509854]'),
(678, 69, 10, 'res_receive|10000|08J9A6', 10000, '2026-06-10 13:45:59', '[RES: 0017509854]'),
(679, 66, 10, 'res_receive|10000|08MCMF', 10000, '2026-06-10 13:46:25', '[RES: 0017509854]'),
(680, 69, 10, 'res_receive|10000|08KG86', 10000, '2026-06-10 13:46:37', '[RES: 0017509854]');
INSERT INTO `stock_logs` (`id`, `product_id`, `user_id`, `action`, `quantity`, `created_at`, `remark`) VALUES
(681, 122, 10, 'res_receive|10000|08N254', 10000, '2026-06-10 13:47:07', '[RES: 0017509856]'),
(682, 122, 10, 'res_receive|10000|08N253', 10000, '2026-06-10 13:47:18', '[RES: 0017509856]'),
(683, 122, 10, 'res_receive|10000|08N251', 10000, '2026-06-10 13:47:32', '[RES: 0017509856]'),
(684, 122, 10, 'res_receive|10000|08N252', 10000, '2026-06-10 13:47:43', '[RES: 0017509856]'),
(685, 122, 10, 'res_receive|10000|08N250', 10000, '2026-06-10 13:47:56', '[RES: 0017509856]'),
(686, 122, 10, 'res_receive|10000|08N24W', 10000, '2026-06-10 13:48:08', '[RES: 0017509856]'),
(687, 122, 10, 'res_receive|10000|08N24V', 10000, '2026-06-10 13:48:20', '[RES: 0017509856]'),
(688, 122, 10, 'res_receive|10000|08N24Y', 10000, '2026-06-10 13:48:31', '[RES: 0017509856]'),
(689, 122, 10, 'res_receive|10000|08N24X', 10000, '2026-06-10 13:49:05', '[RES: 0017509856]'),
(690, 122, 10, 'res_receive|10000|08N24Z', 10000, '2026-06-10 13:49:24', '[RES: 0017509856]'),
(691, 84, 10, 'picklist_issue|10000|08D6B3', 1, '2026-06-10 16:09:33', '[Picklist: MPL26240813] Operator: 086138'),
(692, 66, 10, 'picklist_issue|10000|08MCMF', 1, '2026-06-10 16:23:20', '[Picklist: MPL26240775] Operator: 086138'),
(693, 176, 10, 'res_receive|500|08KNI2', 500, '2026-06-10 16:26:21', '[RES: 0017510303]'),
(694, 176, 10, 'res_receive|500|08KNIH', 500, '2026-06-10 16:26:44', '[RES: 0017510303]'),
(695, 67, 10, 'picklist_issue|10000|08MB3O', 1, '2026-06-10 21:17:18', '[Picklist: MPL26240873] Operator: 086138'),
(696, 65, 10, 'picklist_issue|10000|08FOQJ', 1, '2026-06-10 21:17:19', '[Picklist: MPL26240873] Operator: 086138'),
(697, 174, 8, 'picklist_issue|500|08BRC4', 1, '2026-06-11 00:47:27', '[Picklist: MPL26240904] Operator: 083754'),
(698, 152, 8, 'picklist_issue|10000|08A6FT', 1, '2026-06-11 00:52:41', '[Picklist: MPL26240908] Operator: 083754'),
(699, 32, 8, 'picklist_issue|10000|08CR7X', 1, '2026-06-11 00:52:51', '[Picklist: MPL26240908] Operator: 083754'),
(700, 69, 8, 'picklist_issue|10000|08J9A6', 1, '2026-06-11 00:53:00', '[Picklist: MPL26240908] Operator: 083754'),
(701, 67, 8, 'picklist_issue|10000|08MB3I', 1, '2026-06-11 00:53:08', '[Picklist: MPL26240908] Operator: 083754'),
(702, 67, 8, 'picklist_issue|10000|08MB37', 1, '2026-06-11 00:53:16', '[Picklist: MPL26240908] Operator: 083754'),
(703, 66, 8, 'picklist_issue|10000|08MCMG', 1, '2026-06-11 00:54:07', '[Picklist: MPL26240908] Operator: 083754'),
(704, 144, 8, 'picklist_issue|10000|089U09', 1, '2026-06-11 00:54:46', '[Picklist: MPL26240908] Operator: 083754'),
(705, 22, 8, 'picklist_issue|10000|08DVUP', 1, '2026-06-11 00:55:00', '[Picklist: MPL26240908] Operator: 083754'),
(706, 33, 8, 'picklist_issue|3000|08D5J4', 1, '2026-06-11 00:55:09', '[Picklist: MPL26240908] Operator: 083754'),
(707, 31, 8, 'picklist_issue|10000|08D5RY', 1, '2026-06-11 00:55:25', '[Picklist: MPL26240908] Operator: 083754'),
(708, 84, 8, 'picklist_issue|10000|08D6CJ', 1, '2026-06-11 00:55:36', '[Picklist: MPL26240908] Operator: 083754'),
(709, 150, 8, 'picklist_issue|10000|08F0AS', 1, '2026-06-11 00:55:46', '[Picklist: MPL26240908] Operator: 083754'),
(710, 83, 8, 'picklist_issue|10000|08D3C0', 1, '2026-06-11 00:55:54', '[Picklist: MPL26240908] Operator: 083754'),
(711, 149, 8, 'picklist_issue|10000|08EU7O', 1, '2026-06-11 00:56:03', '[Picklist: MPL26240908] Operator: 083754'),
(712, 116, 8, 'picklist_issue|4000|08JO38', 1, '2026-06-11 00:56:10', '[Picklist: MPL26240908] Operator: 083754'),
(713, 82, 8, 'picklist_issue|10000|08ETY1', 1, '2026-06-11 00:56:19', '[Picklist: MPL26240908] Operator: 083754'),
(714, 106, 8, 'picklist_issue|10000|08ARFA', 1, '2026-06-11 00:56:32', '[Picklist: MPL26240908] Operator: 083754'),
(715, 65, 8, 'picklist_issue|10000|08FORO', 1, '2026-06-11 00:56:40', '[Picklist: MPL26240908] Operator: 083754'),
(716, 65, 8, 'picklist_issue|10000|08FORR', 1, '2026-06-11 00:56:47', '[Picklist: MPL26240908] Operator: 083754'),
(717, 65, 8, 'picklist_issue|10000|08FORM', 1, '2026-06-11 00:56:54', '[Picklist: MPL26240908] Operator: 083754'),
(718, 65, 8, 'picklist_issue|10000|08FOQI', 1, '2026-06-11 00:57:02', '[Picklist: MPL26240908] Operator: 083754'),
(719, 151, 8, 'picklist_issue|10000|08H99Q', 1, '2026-06-11 00:57:11', '[Picklist: MPL26240908] Operator: 083754'),
(720, 148, 8, 'picklist_issue|3000|08EKYN', 1, '2026-06-11 00:57:21', '[Picklist: MPL26240908] Operator: 083754'),
(721, 54, 8, 'picklist_issue|2000|08KDJY', 1, '2026-06-11 00:57:35', '[Picklist: MPL26240908] Operator: 083754'),
(722, 54, 8, 'picklist_issue|2000|08KDJX', 1, '2026-06-11 00:57:40', '[Picklist: MPL26240908] Operator: 083754'),
(723, 9, 8, 'picklist_issue|6000|08BV7O', 1, '2026-06-11 00:58:28', '[Picklist: MPL26240908] Operator: 083754'),
(724, 132, 8, 'picklist_issue|10000|08D3AD', 1, '2026-06-11 01:04:04', '[Picklist: MPL26240908] Operator: 083754'),
(725, 8, 8, 'picklist_issue|2000|08B95S', 1, '2026-06-11 01:04:21', '[Picklist: MPL26240908] Operator: 083754'),
(726, 8, 8, 'picklist_issue|2000|08B95R', 1, '2026-06-11 01:04:25', '[Picklist: MPL26240908] Operator: 083754'),
(727, 176, 8, 'picklist_issue|500|08KNI2', 1, '2026-06-11 01:05:19', '[Picklist: MPL26240909] Operator: 083754'),
(728, 65, 8, 'picklist_issue|10000|08FOQL', 1, '2026-06-11 01:36:22', '[Picklist: CPL26240094] Operator: 083754'),
(729, 122, 8, 'picklist_issue|10000|08N24Y', 1, '2026-06-11 01:39:17', '[Picklist: CPL26240094] Operator: 083754'),
(730, 122, 8, 'add|10000|08N24Y', 1, '2026-06-11 01:45:01', NULL),
(731, 65, 8, 'add|10000|08FOQL', 1, '2026-06-11 01:45:11', NULL),
(732, 65, 8, 'picklist_issue|10000|08FOQL', 1, '2026-06-11 02:58:46', '[Picklist: CPL26240099] Operator: 083754'),
(733, 65, 8, 'picklist_issue|10000|08FOQL', 1, '2026-06-11 03:03:50', '[Picklist: CPL26240100] Operator: 083754'),
(734, 36, 8, 'picklist_issue|908|05LZTB', 1, '2026-06-11 03:03:55', '[Picklist: CPL26240100] Operator: 083754'),
(735, 34, 8, 'picklist_issue|8905|05OMXV', 1, '2026-06-11 03:04:24', '[Picklist: CPL26240100] Operator: 083754'),
(736, 35, 8, 'picklist_issue|9690|05OLPP', 1, '2026-06-11 03:04:37', '[Picklist: CPL26240100] Operator: 083754'),
(737, 154, 8, 'picklist_issue|1843|05ON39', 1, '2026-06-11 03:05:35', '[Picklist: CPL26240100] Operator: 083754'),
(738, 117, 8, 'picklist_issue|1692|089BTZ', 1, '2026-06-11 03:05:52', '[Picklist: CPL26240100] Operator: 083754'),
(739, 128, 8, 'picklist_issue|245|0896YN', 1, '2026-06-11 03:06:07', '[Picklist: CPL26240100] Operator: 083754'),
(740, 121, 8, 'picklist_issue|5838|07R7O9', 1, '2026-06-11 03:06:14', '[Picklist: CPL26240100] Operator: 083754'),
(741, 124, 8, 'picklist_issue|8960|06O8WJ', 1, '2026-06-11 03:06:26', '[Picklist: CPL26240100] Operator: 083754'),
(742, 127, 8, 'picklist_issue|9230|06OA1L', 1, '2026-06-11 03:06:35', '[Picklist: CPL26240100] Operator: 083754'),
(743, 125, 8, 'picklist_issue|5374|07SIOQ', 1, '2026-06-11 03:06:42', '[Picklist: CPL26240100] Operator: 083754'),
(744, 100, 8, 'picklist_issue|535|84712623100C', 1, '2026-06-11 03:06:48', '[Picklist: CPL26240100] Operator: 083754'),
(745, 25, 8, 'picklist_issue|1651|06OCU5', 1, '2026-06-11 03:07:04', '[Picklist: CPL26240100] Operator: 083754'),
(746, 26, 8, 'picklist_issue|886|06H8XW', 1, '2026-06-11 03:07:14', '[Picklist: CPL26240100] Operator: 083754'),
(747, 27, 8, 'picklist_issue|9490|07EE8G', 1, '2026-06-11 03:07:20', '[Picklist: CPL26240100] Operator: 083754'),
(748, 28, 8, 'picklist_issue|2933|06KU26', 1, '2026-06-11 03:07:29', '[Picklist: CPL26240100] Operator: 083754'),
(749, 38, 8, 'picklist_issue|3483|05QF9Q', 1, '2026-06-11 03:08:18', '[Picklist: CPL26240100] Operator: 083754'),
(750, 82, 8, 'picklist_issue|10000|08ETY0', 1, '2026-06-11 03:08:26', '[Picklist: CPL26240100] Operator: 083754'),
(751, 84, 8, 'picklist_issue|10000|08D6CI', 1, '2026-06-11 03:08:31', '[Picklist: CPL26240100] Operator: 083754'),
(752, 12, 8, 'picklist_issue|490|05QFIP', 1, '2026-06-11 03:08:57', '[Picklist: CPL26240100] Operator: 083754'),
(753, 178, 8, 'picklist_issue|9995|07EHMI', 1, '2026-06-11 03:09:32', '[Picklist: CPL26240100] Operator: 083754'),
(754, 177, 8, 'picklist_issue|10000|05NENN', 1, '2026-06-11 03:10:03', '[Picklist: CPL26240100] Operator: 083754'),
(755, 29, 8, 'picklist_issue|9985|07ED0G', 1, '2026-06-11 03:10:34', '[Picklist: CPL26240100] Operator: 083754'),
(756, 13, 8, 'picklist_issue|2940|05OLD9', 1, '2026-06-11 03:10:55', '[Picklist: CPL26240100] Operator: 083754'),
(757, 67, 8, 'picklist_issue|10000|08MB3K', 1, '2026-06-11 03:11:10', '[Picklist: CPL26240100] Operator: 083754'),
(758, 152, 8, 'picklist_issue|10000|08A6GJ', 1, '2026-06-11 03:11:17', '[Picklist: CPL26240100] Operator: 083754'),
(759, 81, 8, 'picklist_issue|6933|847126231009', 1, '2026-06-11 03:11:30', '[Picklist: CPL26240100] Operator: 083754'),
(760, 141, 8, 'picklist_issue|285|08LC6R', 1, '2026-06-11 03:11:40', '[Picklist: CPL26240100] Operator: 083754'),
(761, 16, 8, 'picklist_issue|2348|08D5NP', 1, '2026-06-11 03:11:58', '[Picklist: CPL26240100] Operator: 083754'),
(762, 17, 8, 'picklist_issue|5000|08A6OA', 1, '2026-06-11 03:12:42', '[Picklist: CPL26240100] Operator: 083754'),
(763, 64, 8, 'picklist_issue|1348|05VVLP', 1, '2026-06-11 03:13:59', '[Picklist: CPL26240100] Operator: 083754'),
(764, 122, 8, 'picklist_issue|10000|08N24Y', 1, '2026-06-11 03:16:15', '[Picklist: CPL26240100] Operator: 083754'),
(765, 33, 8, 'res_receive|3000|08D5LI', 3000, '2026-06-11 03:27:55', '[RES: 0017510512]'),
(766, 33, 8, 'res_receive|3000|08D5LJ', 3000, '2026-06-11 03:28:08', '[RES: 0017510512]'),
(767, 33, 8, 'res_receive|3000|08D5K2', 3000, '2026-06-11 03:28:19', '[RES: 0017510512]'),
(768, 9, 8, 'res_receive|6000|08DHH3', 6000, '2026-06-11 03:29:10', '[RES: 0017510512]'),
(769, 9, 8, 'res_receive|6000|08DHH0', 6000, '2026-06-11 03:29:23', '[RES: 0017510512]'),
(770, 9, 8, 'res_receive|6000|08DHGW', 6000, '2026-06-11 03:29:36', '[RES: 0017510512]'),
(771, 62, 8, 'res_receive|5000|08JW2K', 5000, '2026-06-11 03:30:07', '[RES: 0017510512]'),
(772, 62, 8, 'res_receive|5000|08H8TV', 5000, '2026-06-11 03:30:20', '[RES: 0017510512]'),
(773, 173, 8, 'res_receive|1440|08I3V3', 1440, '2026-06-11 03:30:39', '[RES: 0017510512]'),
(774, 173, 8, 'res_receive|1440|08I3XC', 1440, '2026-06-11 03:30:51', '[RES: 0017510512]'),
(775, 33, 8, 'picklist_issue|3000|08D5LI', 1, '2026-06-11 03:31:09', '[Picklist: MPL26240908] Operator: 083754'),
(776, 62, 8, 'picklist_issue|5000|08H8TV', 1, '2026-06-11 03:31:52', '[Picklist: MPL26240908] Operator: 083754'),
(777, 9, 8, 'picklist_issue|6000|08BV7Q', 1, '2026-06-11 04:28:47', '[Picklist: MPL26240908] Operator: 083754'),
(778, 9, 8, 'picklist_issue|6000|08DHH3', 1, '2026-06-11 04:29:49', '[Picklist: MPL26240970] Operator: 083754'),
(779, 172, 8, 'add|1440|08AQAV', 1, '2026-06-11 04:32:21', NULL),
(780, 172, 8, 'picklist_issue|1440|08AQAV', 1, '2026-06-11 04:40:42', '[Picklist: CPL26240101] Operator: 083754');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL COMMENT 'รหัสผู้ใช้ (PK)',
  `username` varchar(100) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (Login)',
  `password` varchar(255) NOT NULL COMMENT 'รหัสผ่าน (เข้ารหัสแล้ว)',
  `role` enum('admin','user','material_prep') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'วันเวลาที่สร้างบัญชี',
  `email` varchar(255) DEFAULT NULL COMMENT 'อีเมล',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ เช่น แผนก, ตำแหน่ง'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='ผู้ใช้งานระบบ (User) - ข้อมูลผู้ใช้งานทั้งหมด';

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `created_at`, `email`, `remark`) VALUES
(4, '088888', '$2y$10$5f6OVE8E3469q7zwVssFMOxQw7lfqRevYo4cXBiVorbRhYR/dcc3O', 'material_prep', '2025-11-05 08:19:01', NULL, NULL),
(5, '085995', '$2y$10$DCz/vG7JuVtNX0NB/F5rq.oz7CmFK4YMPRkd1A4ZRSDHTGpGUrZS6', 'admin', '2025-12-23 15:16:57', 'anupongs@lpn.hanabk.th.com', NULL),
(6, '089999', '$2y$10$yKwVJJT/aI4EOpnduH5sBudE9.lxvc5kqxdOYIOI0C88w7MJC4PPS', 'user', '2026-01-08 14:27:31', NULL, NULL),
(7, '057412', '$2y$10$kS5aDnP1Bcs5fNllJCr4T.J/7MD26UFH50ylcdYW1Efh5CbH4fgTe', 'admin', '2026-01-13 09:51:27', 'jirapap@lpn.hanabk.th.com', NULL),
(8, '083754', '$2y$10$27Strgwto2WgELd3gxqCJOuWfxTQbta1y1307klVmjhY9R3wnyZou', 'material_prep', '2026-06-01 06:53:50', NULL, NULL),
(9, '083208', '$2y$10$vyaACVGVMwLPdzMHbPEXr.V6RRdZUtjK3zQPTpfNXhvxNfyix9DV6', 'material_prep', '2026-06-08 11:55:33', NULL, NULL),
(10, '086138', '$2y$10$ZB9cv4reDOntw.DI1H4M5Od4ws.XuEcV3GLvHszxDkYbgTXW3vFVG', 'material_prep', '2026-06-08 12:03:07', NULL, NULL),
(11, '088998', '$2y$10$LTWdOcdmgvFm44rNaSlol.zwruxk6sFR0ukIZj0QnuBEmOQIccYcq', 'user', '2026-06-08 12:03:25', NULL, NULL),
(12, '088886', '$2y$10$4N.fx.CGnlr8RQ2pb6zYGeouQJ1XnnDXZ6tnSSczMyrSU.RJXiTRW', 'user', '2026-06-08 12:03:44', NULL, NULL),
(13, '070253', '$2y$10$y9mFtPiaSAlvRzySLE24QuMAnmVNDC8Dl3JzZqHF.QasnPAalgn.q', 'user', '2026-06-08 12:04:04', NULL, NULL),
(14, '081596', '$2y$10$VfqC8b2N9VEDtfROvyH2mOssE368N9./AUVvnwrtMxCC7IW.7pqXW', 'user', '2026-06-08 12:04:17', NULL, NULL),
(15, '082957', '$2y$10$pI/vsqLuQRaa5OVoCSd9We.Qs2hIDSF64iA6PQpKJRGaUUNV1nd3e', 'user', '2026-06-08 12:04:29', NULL, NULL);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_inventory_location`
-- (See below for the actual view)
--
CREATE TABLE `v_inventory_location` (
`product_id` int(11)
,`part_name` varchar(255)
,`current_qty` int(11)
,`product_remark` text
,`slot_id` int(11)
,`slot_no` int(11)
,`box_id` int(11)
,`box_code` varchar(50)
,`level_id` int(11)
,`level_no` int(11)
,`rack_id` int(11)
,`rack_name` varchar(50)
,`earliest_expiration` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_stock_history`
-- (See below for the actual view)
--
CREATE TABLE `v_stock_history` (
`log_id` int(11)
,`username` varchar(100)
,`role` enum('admin','user','material_prep')
,`part_name` varchar(255)
,`action` varchar(255)
,`action_type` varchar(255)
,`quantity` int(11)
,`created_at` timestamp
,`log_remark` text
);

-- --------------------------------------------------------

--
-- Structure for view `v_inventory_location`
--
DROP TABLE IF EXISTS `v_inventory_location`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_inventory_location`  AS SELECT `p`.`id` AS `product_id`, `p`.`name` AS `part_name`, `p`.`qty` AS `current_qty`, `p`.`remark` AS `product_remark`, `sl`.`id` AS `slot_id`, `sl`.`slot_no` AS `slot_no`, `b`.`id` AS `box_id`, `b`.`box_code` AS `box_code`, `l`.`id` AS `level_id`, `l`.`level_no` AS `level_no`, `r`.`id` AS `rack_id`, `r`.`name` AS `rack_name`, (select min(`ir`.`ExpirationDate`) from `inventory_receive` `ir` where `ir`.`HanaPart` = `p`.`name` and `ir`.`QtyRemain` > 0) AS `earliest_expiration` FROM ((((`products` `p` join `slots` `sl` on(`p`.`slot_id` = `sl`.`id`)) join `boxes` `b` on(`sl`.`box_id` = `b`.`id`)) join `levels` `l` on(`b`.`level_id` = `l`.`id`)) join `racks` `r` on(`l`.`rack_id` = `r`.`id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `v_stock_history`
--
DROP TABLE IF EXISTS `v_stock_history`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stock_history`  AS SELECT `l`.`id` AS `log_id`, `u`.`username` AS `username`, `u`.`role` AS `role`, `p`.`name` AS `part_name`, `l`.`action` AS `action`, substring_index(`l`.`action`,'|',1) AS `action_type`, `l`.`quantity` AS `quantity`, `l`.`created_at` AS `created_at`, `l`.`remark` AS `log_remark` FROM ((`stock_logs` `l` join `users` `u` on(`l`.`user_id` = `u`.`id`)) join `products` `p` on(`l`.`product_id` = `p`.`id`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_query_cache`
--
ALTER TABLE `ai_query_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `question_hash` (`question_hash`),
  ADD KEY `question_hash_2` (`question_hash`);

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `app_settings_log`
--
ALTER TABLE `app_settings_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_setting_key` (`setting_key`),
  ADD KEY `idx_changed_at` (`changed_at`);

--
-- Indexes for table `bom_items`
--
ALTER TABLE `bom_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `revision_id` (`revision_id`,`material_id`),
  ADD KEY `material_id` (`material_id`);
ALTER TABLE `bom_items` ADD FULLTEXT KEY `idx_ft_bom_remark` (`remark`);

--
-- Indexes for table `boxes`
--
ALTER TABLE `boxes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `level_id` (`level_id`);

--
-- Indexes for table `chat_messages`
--
ALTER TABLE `chat_messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chat_users`
--
ALTER TABLE `chat_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `ethernet_ios`
--
ALTER TABLE `ethernet_ios`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_receive`
--
ALTER TABLE `inventory_receive`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `PUID` (`PUID`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_remark` (`Remark`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_desc` (`Description`);
ALTER TABLE `inventory_receive` ADD FULLTEXT KEY `idx_ft_inv_hanapart` (`HanaPart`);

--
-- Indexes for table `levels`
--
ALTER TABLE `levels`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rack_id` (`rack_id`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `material_code` (`material_code`);
ALTER TABLE `materials` ADD FULLTEXT KEY `idx_ft_mat_remark` (`remark`);
ALTER TABLE `materials` ADD FULLTEXT KEY `idx_ft_mat_desc` (`description`);

--
-- Indexes for table `models`
--
ALTER TABLE `models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `model_code` (`model_code`);
ALTER TABLE `models` ADD FULLTEXT KEY `idx_ft_model_remark` (`remark`);

--
-- Indexes for table `model_revisions`
--
ALTER TABLE `model_revisions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `model_id` (`model_id`,`revision`);

--
-- Indexes for table `production_lines`
--
ALTER TABLE `production_lines`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `production_orders`
--
ALTER TABLE `production_orders`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `production_order_items`
--
ALTER TABLE `production_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `production_reservations`
--
ALTER TABLE `production_reservations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `status` (`status`),
  ADD KEY `revision_id` (`revision_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `block_id` (`slot_id`);
ALTER TABLE `products` ADD FULLTEXT KEY `idx_ft_prod_remark` (`remark`);
ALTER TABLE `products` ADD FULLTEXT KEY `idx_ft_prod_name` (`name`);

--
-- Indexes for table `racks`
--
ALTER TABLE `racks`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reservation_list`
--
ALTER TABLE `reservation_list`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `res_no` (`res_no`);

--
-- Indexes for table `slots`
--
ALTER TABLE `slots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_blocks_box` (`box_id`);

--
-- Indexes for table `stock_logs`
--
ALTER TABLE `stock_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `stock_logs_ibfk_1` (`product_id`);
ALTER TABLE `stock_logs` ADD FULLTEXT KEY `idx_ft_log_remark` (`remark`);
ALTER TABLE `stock_logs` ADD FULLTEXT KEY `idx_ft_log_action` (`action`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_query_cache`
--
ALTER TABLE `ai_query_cache`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `app_settings_log`
--
ALTER TABLE `app_settings_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bom_items`
--
ALTER TABLE `bom_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการ BOM (PK)', AUTO_INCREMENT=601;

--
-- AUTO_INCREMENT for table `boxes`
--
ALTER TABLE `boxes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสกล่อง (PK)', AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT for table `chat_messages`
--
ALTER TABLE `chat_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสข้อความ (PK)';

--
-- AUTO_INCREMENT for table `chat_users`
--
ALTER TABLE `chat_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้แชท (PK)';

--
-- AUTO_INCREMENT for table `ethernet_ios`
--
ALTER TABLE `ethernet_ios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `inventory_receive`
--
ALTER TABLE `inventory_receive`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสการรับสินค้า (PK)', AUTO_INCREMENT=614;

--
-- AUTO_INCREMENT for table `levels`
--
ALTER TABLE `levels`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสชั้น (PK)', AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสวัสดุ (PK)', AUTO_INCREMENT=319;

--
-- AUTO_INCREMENT for table `models`
--
ALTER TABLE `models`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรุ่นงาน (PK)', AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `model_revisions`
--
ALTER TABLE `model_revisions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสเวอร์ชัน (PK)', AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `production_lines`
--
ALTER TABLE `production_lines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `production_orders`
--
ALTER TABLE `production_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสใบสั่งผลิต (PK)', AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `production_order_items`
--
ALTER TABLE `production_order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสรายการ (PK)', AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `production_reservations`
--
ALTER TABLE `production_reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสการจอง (PK)';

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสสินค้า (PK)', AUTO_INCREMENT=188;

--
-- AUTO_INCREMENT for table `racks`
--
ALTER TABLE `racks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสตู้/ชั้นวาง (PK)', AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `reservation_list`
--
ALTER TABLE `reservation_list`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `slots`
--
ALTER TABLE `slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสช่อง (PK)', AUTO_INCREMENT=226;

--
-- AUTO_INCREMENT for table `stock_logs`
--
ALTER TABLE `stock_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสบันทึก (PK)', AUTO_INCREMENT=781;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสผู้ใช้ (PK)', AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bom_items`
--
ALTER TABLE `bom_items`
  ADD CONSTRAINT `bom_items_ibfk_1` FOREIGN KEY (`revision_id`) REFERENCES `model_revisions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bom_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `boxes`
--
ALTER TABLE `boxes`
  ADD CONSTRAINT `boxes_ibfk_1` FOREIGN KEY (`level_id`) REFERENCES `levels` (`id`);

--
-- Constraints for table `levels`
--
ALTER TABLE `levels`
  ADD CONSTRAINT `levels_ibfk_1` FOREIGN KEY (`rack_id`) REFERENCES `racks` (`id`);

--
-- Constraints for table `model_revisions`
--
ALTER TABLE `model_revisions`
  ADD CONSTRAINT `model_revisions_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `production_order_items`
--
ALTER TABLE `production_order_items`
  ADD CONSTRAINT `production_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`slot_id`) REFERENCES `slots` (`id`);

--
-- Constraints for table `slots`
--
ALTER TABLE `slots`
  ADD CONSTRAINT `fk_blocks_box` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `slots_ibfk_1` FOREIGN KEY (`box_id`) REFERENCES `boxes` (`id`);

--
-- Constraints for table `stock_logs`
--
ALTER TABLE `stock_logs`
  ADD CONSTRAINT `stock_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stock_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
