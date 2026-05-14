import { Injectable } from "@angular/core";
import { Sale } from "../models";

export interface EscPosReceiptConfig {
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  charsPerLine: number;
  footer?: string;
}

@Injectable({ providedIn: "root" })
export class EscPosService {
  // ─── ESC/POS commands ─────────────────────────────────────────────────

  /** ESC @ - Initialize printer (clear buffer, reset settings) */
  initPrinter(): string {
    return "\x1B\x40";
  }

  /** GS V 0 - Full cut; GS V 1 - Partial cut */
  cutPaper(full = true): string {
    return full ? "\x1D\x56\x00" : "\x1D\x56\x01";
  }

  /** ESC a n - Set alignment: 0=left, 1=center, 2=right */
  setAlignment(align: "left" | "center" | "right"): string {
    const n = align === "left" ? 0 : align === "center" ? 1 : 2;
    return `\x1B\x61${String.fromCharCode(n)}`;
  }

  /** ESC E n - Bold: 1=on, 0=off */
  setBold(on: boolean): string {
    return `\x1B\x45${String.fromCharCode(on ? 1 : 0)}`;
  }

  // ─── Text formatting ──────────────────────────────────────────────────

  /** Pad or truncate text to exactly `width` characters */
  formatLine(text: string, width: number): string {
    if (text.length > width) return text.slice(0, width);
    return text.padEnd(width, " ");
  }

  /** Center text within a field of `width` characters */
  centerText(text: string, width: number): string {
    if (text.length >= width) return text.slice(0, width);
    const padding = Math.floor((width - text.length) / 2);
    return (
      " ".repeat(padding) + text + " ".repeat(width - padding - text.length)
    );
  }

  /**
   * Format multiple columns into a single line.
   * `cols` is the array of column text.
   * `widths` is the desired width of each column.
   * `totalWidth` is the total line length (fills gaps with spaces).
   */
  formatColumns(cols: string[], widths: number[], totalWidth: number): string {
    let line = "";
    cols.forEach((col, i) => {
      const w = widths[i] ?? totalWidth - line.length;
      if (i === cols.length - 1) {
        // Last column: right-align within remaining space
        const remaining = totalWidth - line.length;
        line += col.padStart(remaining).slice(0, remaining);
      } else {
        line += this.formatLine(col, w);
      }
    });
    return line.slice(0, totalWidth).padEnd(totalWidth, " ");
  }

  /** Repeat `char` `width` times to form a separator */
  separator(width: number, char = "-"): string {
    return char.repeat(width);
  }

  // ─── Receipt generation ───────────────────────────────────────────────

  generateReceiptText(sale: any, config: EscPosReceiptConfig): string {
    const w = config.charsPerLine;
    const lines: string[] = [];

    const push = (text: string) => lines.push(text);
    const pushCmd = (cmd: string) => lines.push(cmd);

    // Initialize
    pushCmd(this.initPrinter());
    pushCmd(this.setAlignment("center"));
    pushCmd(this.setBold(true));

    if (config.storeName) {
      push(this.centerText(config.storeName, w));
    }
    pushCmd(this.setBold(false));

    if (config.storeAddress) {
      push(this.centerText(config.storeAddress, w));
    }
    if (config.storePhone) {
      push(this.centerText(config.storePhone, w));
    }

    push(this.separator(w, "="));
    pushCmd(this.setAlignment("left"));

    // Sale info
    const date = sale.createdAt
      ? new Date(sale.createdAt).toLocaleString()
      : new Date().toLocaleString();
    push(`Ticket #${sale.saleNumber ?? ""}`);
    push(date);

    if (sale.cashier?.username) {
      push(`Cashier: ${sale.cashier.username}`);
    }

    push(this.separator(w));

    // Items
    for (const item of sale.items ?? []) {
      const name = this.formatLine(String(item.productName ?? ""), w - 10);
      const subtotal = (item.subtotal ?? 0).toFixed(2).padStart(8);
      push(`${name} ${subtotal}`);
      push(`  ${item.quantity} x ${(item.unitPrice ?? 0).toFixed(2)}`);
    }

    push(this.separator(w));

    // Totals
    if (sale.discount && sale.discount > 0) {
      push(
        this.formatColumns(
          ["Discount:", sale.discount.toFixed(2)],
          [w - 8, 7],
          w
        )
      );
    }
    push(
      this.formatColumns(
        ["TOTAL:", (sale.total ?? 0).toFixed(2)],
        [w - 8, 7],
        w
      )
    );

    push(this.separator(w, "="));

    // Footer
    pushCmd(this.setAlignment("center"));
    if (config.footer) {
      push(this.centerText(config.footer, w));
    }
    push("");
    push("");

    // Cut
    pushCmd(this.cutPaper(true));

    return lines.join("\n");
  }

  generateTestPage(config: EscPosReceiptConfig): string {
    const w = config.charsPerLine;
    const lines: string[] = [];

    lines.push(this.initPrinter());
    lines.push(this.setAlignment("center"));
    lines.push(this.setBold(true));
    lines.push(this.centerText("--- TEST PAGE ---", w));
    lines.push(this.setBold(false));
    lines.push("");

    if (config.storeName) {
      lines.push(this.centerText(config.storeName, w));
    }

    lines.push(this.separator(w));
    lines.push(this.setAlignment("left"));
    lines.push(this.formatLine(`Width: ${w} chars`, w));
    lines.push(this.formatLine(`Date: ${new Date().toLocaleString()}`, w));
    lines.push(this.separator(w));
    lines.push(this.setAlignment("center"));
    lines.push(this.centerText("Printing OK", w));
    lines.push("");
    lines.push("");
    lines.push(this.cutPaper(true));

    return lines.join("\n");
  }
}
