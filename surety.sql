-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 12, 2024 at 05:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `surety`
--

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `queue_id` int(11) UNSIGNED ZEROFILL DEFAULT NULL,
  `order_addname` varchar(500) DEFAULT NULL,
  `order_address` varchar(250) DEFAULT NULL,
  `order_shipname` varchar(50) DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `order_tracknum` varchar(40) DEFAULT NULL,
  `order_status` int(10) NOT NULL,
  `payment_img` varchar(255) NOT NULL,
  `payment_time` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `product_name` varchar(50) NOT NULL,
  `product_caption` varchar(500) DEFAULT NULL,
  `product_img` varchar(500) NOT NULL,
  `product_price` int(10) NOT NULL,
  `product_cate` int(10) UNSIGNED DEFAULT NULL,
  `product_type` varchar(255) NOT NULL,
  `product_detail` varchar(500) DEFAULT NULL,
  `product_clothsize` varchar(255) DEFAULT NULL,
  `product_shoesize` int(10) DEFAULT NULL,
  `product_time` datetime NOT NULL,
  `product_time_duration` time NOT NULL,
  `product_status` int(10) NOT NULL,
  `seller_id` int(11) UNSIGNED ZEROFILL NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `queue`
--

CREATE TABLE `queue` (
  `queue_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `cus_id` int(11) UNSIGNED ZEROFILL DEFAULT NULL,
  `queue_num` int(150) UNSIGNED NOT NULL,
  `queue_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `queue_estimated_time` timestamp NULL DEFAULT NULL,
  `queue_status` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `report_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `seller_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `cus_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `report_img` varchar(500) NOT NULL,
  `report_reason` varchar(500) NOT NULL,
  `report_detail` varchar(500) NOT NULL,
  `report_status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `review`
--

CREATE TABLE `review` (
  `review_id` int(11) NOT NULL,
  `order_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `score` int(10) UNSIGNED NOT NULL,
  `comment` varchar(500) DEFAULT NULL,
  `review_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `review_img` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `users_id` int(11) UNSIGNED ZEROFILL NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(100) NOT NULL,
  `phonenum` varchar(10) NOT NULL,
  `role` int(50) UNSIGNED NOT NULL,
  `id_img` varchar(500) DEFAULT NULL,
  `bank_ac_name` varchar(225) DEFAULT NULL,
  `bank_ac_type` varchar(225) DEFAULT NULL,
  `bank_ac_num` varchar(225) DEFAULT NULL,
  `sacc_contact` varchar(500) DEFAULT NULL,
  `user_status` int(50) UNSIGNED NOT NULL,
  `profile_img` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `queue` (`queue_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `seller` (`seller_id`);

--
-- Indexes for table `queue`
--
ALTER TABLE `queue`
  ADD PRIMARY KEY (`queue_id`),
  ADD KEY `cus_id` (`cus_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `fk_seller` (`seller_id`),
  ADD KEY `fk_customer` (`cus_id`);

--
-- Indexes for table `review`
--
ALTER TABLE `review`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `order` (`order_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`users_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=70;

--
-- AUTO_INCREMENT for table `queue`
--
ALTER TABLE `queue`
  MODIFY `queue_id` int(11) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=273;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `report_id` int(11) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `review`
--
ALTER TABLE `review`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `users_id` int(11) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `queue` FOREIGN KEY (`queue_id`) REFERENCES `queue` (`queue_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`users_id`);

--
-- Constraints for table `queue`
--
ALTER TABLE `queue`
  ADD CONSTRAINT `cus_id` FOREIGN KEY (`cus_id`) REFERENCES `users` (`users_id`),
  ADD CONSTRAINT `product_id` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `fk_customer` FOREIGN KEY (`cus_id`) REFERENCES `users` (`users_id`),
  ADD CONSTRAINT `fk_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`users_id`);

--
-- Constraints for table `review`
--
ALTER TABLE `review`
  ADD CONSTRAINT `order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
