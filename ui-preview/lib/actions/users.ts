"use server";

import { students, success } from "../mock-data";

export async function getAllStudents(_input: object) {
  return success(students);
}
