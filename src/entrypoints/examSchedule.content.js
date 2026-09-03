import { defineContentScript } from "wxt/utils/define-content-script";

import { boot } from "../core/boot";
import ExamSchedule from "../features/exam-schedule/ExamSchedule.svelte";
import { scrapeExamPage } from "../features/exam-schedule/scraper";

import "../assets/styles.css";

export default defineContentScript({
  matches: ["https://*.reg.kmitl.ac.th/u_student/report_examtable_show.php"],
  main() {
    boot({
      scrape: scrapeExamPage,
      component: ExamSchedule,
      toProps: (scraped, oldHtml) => ({
        schedule: scraped.schedule,
        data: scraped.data,
        oldDesign: oldHtml,
      }),
    });
  },
});
