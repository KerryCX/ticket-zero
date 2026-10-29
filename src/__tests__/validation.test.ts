import { Request, Response } from "express";
import {
  validateCreateTicket,
  validateUpdateTicket,
} from "../middleware/validation";

// Unit tests call the middleware directly with fake req/res objects,
// so each validation rule is checked without going through HTTP.
const run = (
  middleware: typeof validateCreateTicket,
  body: Record<string, unknown>,
) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const next = jest.fn();
  middleware({ body } as Request, { status } as unknown as Response, next);
  return { json, status, next };
};

describe("validateCreateTicket", () => {
  it("calls next for a minimal valid body", () => {
    const { next, status } = run(validateCreateTicket, { title: "Ok" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it.each([
    ["missing title", {}],
    ["empty title", { title: "" }],
    ["whitespace title", { title: "  " }],
    ["non-string title", { title: 5 }],
  ])("rejects %s", (_name, body) => {
    const { next, status, json } = run(validateCreateTicket, body);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: expect.stringContaining("title"),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an unknown status and lists the allowed values", () => {
    const { status, json } = run(validateCreateTicket, {
      title: "x",
      status: "closed",
    });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: expect.stringContaining("waiting-on-customer"),
    });
  });

  it("rejects an unknown priority", () => {
    const { status, json } = run(validateCreateTicket, {
      title: "x",
      priority: "urgent",
    });
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: expect.stringContaining("priority"),
    });
  });
});

describe("validateUpdateTicket", () => {
  it("calls next for an empty body, since PATCH fields are optional", () => {
    const { next } = run(validateUpdateTicket, {});
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next when every provided field is valid", () => {
    const { next } = run(validateUpdateTicket, {
      title: "New",
      status: "resolved",
      priority: "low",
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["empty title", { title: "" }],
    ["whitespace title", { title: "   " }],
    ["non-string title", { title: false }],
    ["bad status", { status: "nope" }],
    ["bad priority", { priority: "nope" }],
  ])("rejects %s", (_name, body) => {
    const { next, status } = run(validateUpdateTicket, body);
    expect(status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
