/**
 * Re-export centralized Prisma client from prisma folder
 * This avoids duplicate Prisma Client instances across the app
 */
import prisma from "../../prisma/client";
export default prisma;
