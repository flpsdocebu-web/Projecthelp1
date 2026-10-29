# Registration school list

Source: `list of schools - Updated.xlsx`, worksheet `SDO-public`, supplied on October 29, 2026. The worksheet is labeled SY 2024–2025. The source workbook is not modified.

`registration-schools.json` retains each numbered school row separately with its original district, School ID, school name, and worksheet row number. District labels are normalized only when displayed or saved through registration.

There are 1,146 source entries. The 1,143 entries with a school name, School ID, and recognized district are selectable. No existing accounts are backfilled or changed.

Incomplete source entries retained but unavailable for registration:

| Source row | School ID | School name | Missing field |
| --- | --- | --- | --- |
| 262 | 312409 | Blank | School name |
| 372 | 306411 | Lanipga National High School | District |
| 1077 | 306634 | KABALAWAN STAND-ALONE SHS | District |

Repeated IDs are preserved as separate choices, not merged:

| School ID | Source rows | Names |
| --- | --- | --- |
| 302969 | 707, 712 | CAMP 7 ELEMENTARY SCHOOL; CAMP 7 NATIONAL HIGH SCHOOL |
| 502824 | 944, 946 | TAMBONGON INTEGRATED SCHOOL; VICTORIA INTEGRATED SCHOOL |

Registration submits a source-row selection key. The server resolves that key against this catalog, verifies the selected district, and saves the catalog's exact school name and ID. Manually supplied conflicting values are rejected. If this catalog is replaced, review source-row keys and require cached clients with changed selections to refresh.
