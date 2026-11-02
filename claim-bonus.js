import { json } from "./_lib.js";

export default async function handler(req, res) {
  return json(res, 410, {
    error: "The starting bonus is now automatic."
  });
}
