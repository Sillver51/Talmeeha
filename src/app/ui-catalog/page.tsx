"use client";

/**
 * UI Catalog — a living "DESIGN.md as components" showcase.
 *
 * Proves shadcn/ui (radix-nova, Tailwind v4) renders on-brand under our
 * always-dark Liquid-Night theme, in RTL, with Arabic labels. This is a
 * proof-of-integration only; the existing game components (Toast,
 * SettingsSheet, …) are NOT migrated here — that is a later step.
 *
 * Visit /ui-catalog in dev to eyeball the components.
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-extrabold text-[var(--gold2)]">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function UiCatalogPage() {
  const [reducedMotion, setReducedMotion] = useState(false);

  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-foreground">
          معرض مكوّنات الواجهة
        </h1>
        <p className="text-sm text-muted-foreground">
          shadcn/ui + Tailwind v4 — مطابق لهوية «ليلة سائلة» وداعم للاتجاه RTL.
        </p>
      </header>

      <Section title="الأزرار">
        <Button>زر أساسي</Button>
        <Button variant="secondary">ثانوي</Button>
        <Button variant="outline">محدد</Button>
        <Button variant="ghost">شفاف</Button>
        <Button variant="destructive">حذف</Button>
        <Button variant="link">رابط</Button>
        <Button disabled>معطّل</Button>
      </Section>

      <Section title="البطاقة">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>بطاقة القائد</CardTitle>
            <CardDescription>
              يعطي تلميحة من كلمة واحدة ورقماً لفريقه.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            هذه بطاقة shadcn تستخدم رموز السمة الخاصة بنا: خلفية السطح، حدود
            زجاجية، ونص العلامة الذهبي.
          </CardContent>
          <CardFooter>
            <Button size="sm" onClick={() => toast.success("تم إرسال التلميحة")}>
              أرسل التلميحة
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="النافذة الحوارية">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">افتح النافذة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد إعادة الضبط</DialogTitle>
              <DialogDescription>
                سيُعاد تعيين النتيجة لكلا الفريقين. لا يمكن التراجع عن هذا
                الإجراء.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">إلغاء</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => toast("أُعيد ضبط النتيجة")}
                >
                  إعادة الضبط
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="المفتاح">
        <label className="flex items-center gap-3 text-sm font-bold text-foreground">
          <Switch
            checked={reducedMotion}
            onCheckedChange={setReducedMotion}
          />
          تقليل الحركة
        </label>
        <span className="text-sm text-muted-foreground">
          الحالة: {reducedMotion ? "مُفعّل" : "متوقّف"}
        </span>
      </Section>

      <Section title="التلميح">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">مرّر فوقي</Button>
          </TooltipTrigger>
          <TooltipContent>القاتل: كلمة تُنهي اللعبة فوراً</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="الإشعارات (Sonner)">
        <Button onClick={() => toast("تلميحة جديدة من القائد")}>
          إشعار عادي
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.success("فاز الفريق الأحمر")}
        >
          إشعار نجاح
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast.error("كُشف القاتل!")}
        >
          إشعار خطأ
        </Button>
      </Section>
    </main>
  );
}
