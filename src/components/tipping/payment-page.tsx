"use client";
import { YocoReceipt } from "@/components/tipping/yoco-receipt";
import { DemoPayment } from "@/components/tipping/demo-payment";
export function Payment({ id }: { id: string }) {
  return id.startsWith("demo-") ? (
    <DemoPayment id={id} />
  ) : (
    <YocoReceipt id={id} />
  );
}
