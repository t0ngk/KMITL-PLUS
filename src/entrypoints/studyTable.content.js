import { defineContentScript } from "wxt/utils/define-content-script";

import { boot } from "../core/boot";
import StudyTable from "../features/study-table/StudyTable.svelte";
import { scrapeStudyTablePage } from "../features/study-table/scraper";

import "../assets/styles.css";

export default defineContentScript({
  matches: ["https://*.reg.kmitl.ac.th/u_student/report_studytable_show.php"],
  main() {
    boot({
      scrape: scrapeStudyTablePage,
      component: StudyTable,
      toProps: (scraped, oldHtml) => ({
        schedule: scraped.schedule,
        info: scraped.info,
        oldTable: oldHtml,
      }),
    });
  },
});
