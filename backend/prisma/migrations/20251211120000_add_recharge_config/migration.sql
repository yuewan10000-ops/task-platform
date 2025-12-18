-- CreateTable
CREATE TABLE `RechargeConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `trc20Address` VARCHAR(191) NULL,
    `trxAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

