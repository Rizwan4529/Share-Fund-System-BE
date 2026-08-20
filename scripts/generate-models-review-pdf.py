"""Generate a numbered, easy-to-read PDF of backend model issues."""

from pathlib import Path

from fpdf import FPDF

OUT_DIR = Path(r"D:\Client Projects\Share Fund System (SFS)\Docs")
OUT_PATH = OUT_DIR / "SFS Backend Models Review - Numbered Issues to Fix.pdf"

NAVY = (18, 42, 74)
TEAL = (13, 107, 99)
RED = (153, 27, 27)
AMBER = (146, 64, 14)
BLUE = (30, 64, 175)
SLATE = (51, 65, 85)
MUTED = (100, 116, 139)
LINE = (226, 232, 240)
LIGHT = (248, 250, 252)
WHITE = (255, 255, 255)
CODE_BG = (241, 245, 249)


PRIORITY_COLOR = {
    "crash": RED,
    "design": AMBER,
    "style": BLUE,
    "habit": TEAL,
}


class ReviewPDF(FPDF):
    def __init__(self):
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=True, margin=22)
        self.set_margins(16, 22, 16)
        self.alias_nb_pages()

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 12, "F")
        self.set_xy(16, 3.5)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*WHITE)
        self.cell(
            0,
            5,
            "Share Fund System  |  Backend Models Review  |  Numbered issues to fix",
            align="L",
        )
        self.set_xy(0, 14)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-14)
        self.set_draw_color(*LINE)
        self.line(16, self.get_y(), 194, self.get_y())
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, "Work through the list in order. Tick each item when it is done.", align="L")
        self.set_xy(160, -12)
        self.cell(34, 6, f"Page {self.page_no()}/{{nb}}", align="R")

    def content_width(self):
        return self.w - self.l_margin - self.r_margin

    def ensure(self, h):
        if self.get_y() + h > self.page_break_trigger:
            self.add_page()

    def h1(self, text):
        self.ensure(16)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*NAVY)
        self.multi_cell(self.content_width(), 8, self._t(text))
        self.set_draw_color(*TEAL)
        self.set_line_width(0.6)
        y = self.get_y()
        self.line(self.l_margin, y + 1, self.l_margin + 42, y + 1)
        self.set_line_width(0.2)
        self.ln(6)

    def h2(self, text):
        self.ensure(14)
        self.ln(2)
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", 11)
        self.cell(self.content_width(), 9, f"  {self._t(text)}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def _t(self, text):
        return (
            str(text)
            .replace("\u2014", "-")
            .replace("\u2013", "-")
            .replace("\u2018", "'")
            .replace("\u2019", "'")
            .replace("\u201c", '"')
            .replace("\u201d", '"')
        )

    def para(self, text, size=10.5, leading=5.4, color=SLATE):
        self.set_font("Helvetica", "", size)
        self.set_text_color(*color)
        self.multi_cell(self.content_width(), leading, self._t(text))
        self.ln(1.5)

    def bold_para(self, label, text):
        self.ensure(10)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.multi_cell(self.content_width(), 5.2, self._t(label))
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(self.content_width(), 5.2, self._t(text))
        self.ln(1.2)

    def bullet(self, text):
        self.ensure(8)
        x = self.get_x()
        y = self.get_y()
        self.set_fill_color(*TEAL)
        self.circle(x + 1.6, y + 2.4, 0.85, "F")
        self.set_xy(x + 6, y)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(self.content_width() - 6, 5.2, self._t(text))
        self.ln(0.6)

    def code_block(self, text):
        self.ensure(18)
        self.set_fill_color(*CODE_BG)
        self.set_draw_color(*LINE)
        x = self.l_margin
        y = self.get_y()
        self.set_font("Courier", "", 8.5)
        text = self._t(text)
        lines = text.split("\n")
        h = 4.6 * len(lines) + 5
        self.rect(x, y, self.content_width(), h, "FD")
        self.set_xy(x + 3, y + 2.5)
        self.set_text_color(30, 41, 59)
        self.multi_cell(self.content_width() - 6, 4.6, text)
        self.ln(3)

    def callout(self, title, body, color):
        self.ensure(22)
        title = self._t(title)
        body = self._t(body)
        x = self.l_margin
        y = self.get_y()
        w = self.content_width() - 7
        self.set_xy(x + 5, y + 2.5)
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(*color)
        self.multi_cell(w, 5, title)
        self.set_x(x + 5)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*SLATE)
        self.multi_cell(w, 5, body)
        h = self.get_y() - y + 2
        self.set_fill_color(250, 250, 250)
        self.rect(x + 2.2, y, self.content_width() - 2.2, h, "F")
        self.set_fill_color(*color)
        self.rect(x, y, 2.2, h, "F")
        self.set_xy(x + 5, y + 2.5)
        self.set_font("Helvetica", "B", 9.5)
        self.set_text_color(*color)
        self.multi_cell(w, 5, title)
        self.set_x(x + 5)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*SLATE)
        self.multi_cell(w, 5, body)
        self.ln(3)

    def issue(self, num, title, priority, what, why, explain, files, steps):
        self.ensure(42)
        title = self._t(title)
        what = self._t(what)
        why = self._t(why)
        explain = self._t(explain)
        files = self._t(files)
        steps = [self._t(s) for s in steps]
        color = PRIORITY_COLOR.get(priority, NAVY)
        label = {
            "crash": "FIX FIRST  -  this can crash or block the app",
            "design": "MODEL DESIGN  -  fix before controllers",
            "style": "CONSISTENCY  -  same pattern everywhere",
            "habit": "BACKEND HABIT  -  start this before controllers",
        }[priority]

        self.set_fill_color(*color)
        self.set_text_color(*WHITE)
        self.set_font("Helvetica", "B", 12)
        self.cell(14, 10, str(num), align="C", fill=True)
        self.set_fill_color(*NAVY)
        self.cell(
            self.content_width() - 14,
            10,
            f"  {title}",
            fill=True,
            new_x="LMARGIN",
            new_y="NEXT",
        )

        self.set_fill_color(252, 252, 252)
        self.set_text_color(*color)
        self.set_font("Helvetica", "B", 8)
        self.cell(
            self.content_width(),
            6,
            f"  {label}     [  ]  Done",
            fill=True,
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.ln(2.5)

        self.bold_para("What is wrong", what)
        self.bold_para("Why this matters (in simple words)", why)
        self.bold_para("A little more explanation", explain)
        self.bold_para("Where to look", files)

        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.multi_cell(self.content_width(), 5.2, "How to fix it")
        for i, step in enumerate(steps, 1):
            self.ensure(8)
            self.set_font("Helvetica", "", 10)
            self.set_text_color(*SLATE)
            self.multi_cell(self.content_width(), 5.2, f"    {i}.  {step}")
        self.ln(2)

        self.set_draw_color(*LINE)
        self.line(self.l_margin, self.get_y(), self.l_margin + self.content_width(), self.get_y())
        self.ln(5)


def add_cover(pdf: ReviewPDF):
    pdf.add_page()
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 297, "F")
    pdf.set_fill_color(*TEAL)
    pdf.rect(0, 0, 8, 297, "F")

    pdf.set_xy(24, 42)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(148, 197, 191)
    pdf.cell(0, 8, "SHARE FUND SYSTEM  ·  BACKEND")

    pdf.set_xy(24, 58)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*WHITE)
    pdf.multi_cell(160, 12, "Backend Models Review")

    pdf.set_xy(24, 90)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(153, 246, 228)
    pdf.multi_cell(160, 8, "Numbered issues to fix, one by one")

    pdf.set_xy(24, 112)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(203, 213, 225)
    pdf.multi_cell(
        160,
        6.5,
        "This PDF is a checklist for your first backend project.\n"
        "Every issue from the code review is listed in order.\n"
        "Each item tells you what is wrong, why it matters,\n"
        "which file to open, and the exact steps to fix it.",
    )

    pdf.set_fill_color(15, 32, 58)
    pdf.rect(24, 168, 162, 78, "F")
    pdf.set_xy(30, 176)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(153, 246, 228)
    pdf.cell(0, 7, "How this list is grouped")
    pdf.set_xy(30, 188)
    pdf.set_font("Helvetica", "", 10.5)
    pdf.set_text_color(226, 232, 240)
    pdf.multi_cell(
        150,
        6,
        "Issues 1 to 5     Crash bugs. Fix these first.\n"
        "Issues 6 to 14    Same style everywhere.\n"
        "Issues 15 to 22   Model design (data rules).\n"
        "Issues 23 to 27   Missing pieces from the architecture.\n"
        "Issues 28 to 34   Habits to start before controllers.",
    )

    pdf.set_xy(24, 262)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 5, "Prepared for Muhammad Rizwan  ·  August 2026  ·  Models only, before controllers")


def add_howto(pdf: ReviewPDF):
    pdf.add_page()
    pdf.h1("How to use this PDF")
    pdf.para(
        "You asked for a point-by-point list so you can fix things one at a time. "
        "That is exactly how this document is built. Do not try to fix everything in one sitting. "
        "Finish one number, tick it, then go to the next."
    )
    pdf.para("Suggested way to work:")
    pdf.bullet("Print this PDF or keep it open beside Cursor.")
    pdf.bullet("Start at Issue 1. Do not skip the crash bugs.")
    pdf.bullet("After you change a file, save it and check that Node still starts.")
    pdf.bullet("When an item is done, mark  [  ]  Done  at the top of that issue.")
    pdf.bullet("When Issues 1 to 27 are done, you are ready to write controllers.")

    pdf.callout(
        "Simple idea to remember",
        "A model is a blueprint. It tells MongoDB what a document looks like. "
        "If the blueprint is wrong, every controller you write later will fight the database. "
        "Fixing models now is cheaper than rewriting controllers later.",
        TEAL,
    )

    pdf.h2("What you are already doing well")
    pdf.para(
        "This is your first backend, and several habits are already right. Keep these."
    )
    pdf.bullet("You put allowed values in src/utils/constants.js instead of typing strings in every file.")
    pdf.bullet("You write required: [true, \"a clear message\"] so users get a readable error.")
    pdf.bullet("You use ref: \"User\" (and similar) instead of copying a whole user into every document.")
    pdf.bullet("Most models use { timestamps: true }, so createdAt and updatedAt appear automatically.")
    pdf.bullet("Your later models (BmisQueue, Payment, Notification) are cleaner than the early ones. That is normal. Copy the later style going forward.")
    pdf.bullet("You already learned that type: Object skips nested field rules. That same lesson applies to type: Array.")

    pdf.h2("Words used in this PDF (plain English)")
    pdf.bold_para("Import", "A file saying \"I need this thing from another file.\" If you use ENUMS but never import it, the file crashes.")
    pdf.bold_para("Export", "A file saying \"other files may use this.\" If SuccessProfile is never exported, controllers cannot import it.")
    pdf.bold_para("Enum", "A short list of allowed words, like pending / completed / failed. Anything else is rejected.")
    pdf.bold_para("Ref / populate", "A pointer to another document (an ObjectId). populate() follows that pointer. The name in ref must match the model name exactly.")
    pdf.bold_para("Index", "A lookup shortcut. Like a book index. Without it, MongoDB scans every document. A unique index also blocks duplicates.")
    pdf.bold_para("Snapshot", "A frozen copy of values at one moment (for example the plan price at purchase time). Later plan edits must not change old purchases.")
    pdf.bold_para("Append-only", "You may add new rows. You must not edit or delete old ones. The money ledger should work this way.")


def add_issues(pdf: ReviewPDF):
    pdf.add_page()
    pdf.h1("Part A  -  Crash bugs  (Issues 1 to 5)")
    pdf.para(
        "These will throw errors as soon as the file is loaded, or populate() will fail. "
        "Fix this group before anything else. After each fix, run the server once to confirm it still starts."
    )

    pdf.issue(
        1,
        "ProgramCycle uses Scheme instead of Schema",
        "crash",
        "Near the top of ProgramCycle.js you wrote:  const { Scheme, model } = mongoose;",
        "JavaScript is picky about spelling. mongoose has Schema, not Scheme. "
        "You then call new Schema(...). Schema is undefined, so this file crashes the moment anything imports it. "
        "Later, when a controller needs ProgramCycle, the whole server can fail to boot.",
        "Think of it like importing a toolbox but grabbing the wrong name. The toolbox has a hammer called Schema. "
        "You asked for Scheme, which does not exist, so your hand comes back empty. Then you try to use Schema anyway.",
        "src/models/ProgramCycle.js  (around line 3)",
        [
            "Open ProgramCycle.js.",
            "Change Scheme to Schema:  const { Schema, model } = mongoose;",
            "Save the file.",
            "Start the server. If this file loads, this issue is done.",
        ],
    )

    pdf.issue(
        2,
        "ActivationProgress uses ENUMS but never imports it",
        "crash",
        "ActivationProgress.js uses Object.values(ENUMS.ACTIVATION_PROGRESS_...) in several fields, but the file only imports mongoose. There is no:  import { ENUMS } from \"#/utils/constants\";",
        "When Node loads this file, it looks for ENUMS, cannot find it, and throws ReferenceError: ENUMS is not defined. "
        "Any route that touches ActivationProgress will crash.",
        "You already import ENUMS the right way in files like Notification.js, BmisQueue.js, and Payment.js. "
        "Copy that one line to the top of ActivationProgress.js. Also add { timestamps: true } while you are here (see Issue 10).",
        "src/models/ActivationProgress.js  (top of file, and fields around lines 81 to 106)",
        [
            "Add this as the first import:  import { ENUMS } from \"#/utils/constants\";",
            "Keep the mongoose import.",
            "Save and start the server. The ReferenceError should be gone.",
        ],
    )

    pdf.issue(
        3,
        "SuccessProfile never exports the model",
        "crash",
        "The file creates the model:  const SuccessProfile = model(\"SuccessProfile\", successProfileSchema);  but there is no  export default SuccessProfile;",
        "Other files cannot import SuccessProfile. When you write a controller like  import SuccessProfile from \"#/models/SuccessProfile\", Node will say the module has no default export. "
        "You will be stuck before you even save a profile.",
        "Almost every other model ends with export default ModelName. SuccessProfile is the one that is missing it. "
        "This is a small change with a big effect.",
        "src/models/SuccessProfile.js  (last line of the file)",
        [
            "Scroll to the bottom of SuccessProfile.js.",
            "After the model line, add:  export default SuccessProfile;",
            "Save. From a controller you should now be able to import it.",
        ],
    )

    pdf.issue(
        4,
        "User looks up ENUMS.FOUNDER_TIER but constants names it founderTier",
        "crash",
        "In constants.js the key is founderTier (camelCase). In User.js the field uses ENUMS.FOUNDER_TIER (SCREAMING_SNAKE). Those are two different names. ENUMS.FOUNDER_TIER is undefined.",
        "The founderTier field on User will not get a real list of allowed values. Validation will not work as you expect. "
        "You may also get confusing errors when creating a user. This is the same class of bug as Issue 1: the name does not match.",
        "Your other enums are written like FOUNDER_WAITLIST_STATUS and SUCCESS_PROFILE_TYPE. Only founderTier is camelCase. "
        "Pick one style. The rest of the project uses UPPER_SNAKE, so rename the constants key to FOUNDER_TIER.",
        "src/utils/constants.js  (around line 51)   AND   src/models/User.js  (around lines 128 to 137)",
        [
            "In constants.js rename founderTier to FOUNDER_TIER.",
            "In User.js keep ENUMS.FOUNDER_TIER (that name will now exist).",
            "Search the project for founderTier to make sure nothing else still uses the old name.",
        ],
    )

    pdf.issue(
        5,
        "FollowMeAllocation points at \"Users\" but the model is named \"User\"",
        "crash",
        "followerParticipantId and followedParticipantId use ref: \"Users\" (plural). Your User model is registered as model(\"User\", ...). One letter s extra.",
        "ref must match the model name exactly. populate() uses that name to find the collection. "
        "\"Users\" will not match \"User\", so populate will fail and those fields will look empty even when the ObjectId is valid.",
        "This is like putting the wrong apartment number on a letter. The person exists, but the postman looks in the wrong place. "
        "Notification.js, Payment.js, and BmisQueue.js already use ref: \"User\". Match them.",
        "src/models/FollowMeAllocation.js  (around lines 8 to 17)",
        [
            "Change both ref: \"Users\" to ref: \"User\".",
            "Do not rename the User model. Keep one name: User.",
            "Later, when you test populate(), follower and followed users should load.",
        ],
    )

    pdf.h1("Part B  -  Same style everywhere  (Issues 6 to 14)")
    pdf.para(
        "These will not always crash today. They will slow you down and create bugs that are hard to see. "
        "The goal is one pattern, copied in every model, so controllers feel boring and safe."
    )

    pdf.issue(
        6,
        "Two different ways of writing enums in models",
        "style",
        "Early models (User, SuccessProfile) list every enum value by hand: enum: [ENUMS.ROLES.ADMIN, ENUMS.ROLES.USER]. Later models use enum: Object.values(ENUMS.SOMETHING). Both work. Mixing them does not.",
        "When you add a new allowed value in constants.js, Object.values picks it up automatically. The hand-written lists do not. "
        "That is how User missed qualified / disqualified / expired (Issue 7). One style removes that class of bug.",
        "Object.values(ENUMS.X) means: \"take every value inside this object and allow all of them.\" "
        "You still set a default with ENUMS.X.SOME_VALUE. Look at BmisQueue.js or Payment.js and copy that shape.",
        "src/models/User.js, src/models/SuccessProfile.js  (and any other model that still lists values one by one)",
        [
            "Pick the later style as the team standard: enum: Object.values(ENUMS.NAME), default: ENUMS.NAME.SOMETHING.",
            "Update User.js fields: role, founderWaitlistStatus, founderApplicantStatus, founderQualificationStatus, founderTier, contactMethod, status.",
            "Update SuccessProfile.js fields: profileType, status, discretionaryRule.label.",
            "Do not change the string values themselves (keep \"admin\", \"user\", and so on).",
        ],
    )

    pdf.issue(
        7,
        "User cannot be saved as a qualified Founder",
        "style",
        "constants.js allows founderQualificationStatus: not_started, pending_verification, pending_profile, pending_disclosures, pending_activation, qualified, disqualified, expired. "
        "User.js only allows the first five. qualified, disqualified, and expired are missing from the model's enum list.",
        "The whole Founder flow ends at \"qualified\". If the model rejects that word, you can never mark someone as an official Founder. "
        "The save will fail with a validation error, and it will look like a controller bug even though the model is the problem.",
        "This happened because the enum was typed by hand (Issue 6). If you switch to Object.values, this issue disappears at the same time. "
        "That is why style rules matter: they prevent real business bugs.",
        "src/models/User.js  (founderQualificationStatus, around lines 116 to 126)   AND   src/utils/constants.js  (FOUNDER_QUALIFICATION_STATUS)",
        [
            "Either add QUALIFIED, DISQUALIFIED, and EXPIRED to the User.js enum list,",
            "or (better) change the field to enum: Object.values(ENUMS.FOUNDER_QUALIFICATION_STATUS).",
            "Keep the default as NOT_STARTED.",
        ],
    )

    pdf.issue(
        8,
        "Spelling mistakes inside ENUMS that will leak into the API",
        "style",
        "Several constant names and values are misspelled: RECURING (should be RECURRING), CONFRIMED / \"confrimed\" (should be CONFIRMED / \"confirmed\"), RECOMENDATION_READY (should be RECOMMENDATION_READY), PAYMENT_RECIEVED (should be PAYMENT_RECEIVED).",
        "These strings are stored in MongoDB and sent to the frontend. If the backend says \"confrimed\" and the frontend checks for \"confirmed\", features silently break. "
        "Fixing spelling later means a database migration, because old documents already have the wrong word.",
        "Fix spelling now, while you have no real users and no production data. After launch, this becomes painful. "
        "Search the whole repo after you rename, including dummy documents and comments.",
        "src/utils/constants.js  (SUCCESS_CENTER_GOAL_NATURE, ACTIVATION_PROGRESS_FUNDING_ESTIMATE_STATUS, NOTIFICATION_TYPE)",
        [
            "Change RECURING to RECURRING, and the value \"recurring\" is already correct (only the key is wrong).",
            "Change CONFRIMED: \"confrimed\" to CONFIRMED: \"confirmed\".",
            "Change RECOMENDATION_READY to RECOMMENDATION_READY.",
            "Change PAYMENT_RECIEVED to PAYMENT_RECEIVED. The value \"payment_received\" is already spelled right.",
            "Search the project for the old names so no file still points at them.",
        ],
    )

    pdf.issue(
        9,
        "SuccessCenterCategory has \"sucess\" in names (missing one c)",
        "style",
        "The schema variable is sucessCenterCategorySchema. The exported model variable is SucessCenterCategory. The registered name is luckily correct: model(\"SuccessCenterCategory\", ...).",
        "The registered name is what refs use, so populate may still work. But you will import SucessCenterCategory in controllers and keep the typo forever. "
        "It also makes search-and-replace harder. Spell it Success everywhere.",
        "Same idea as Issue 5: one correct name, used in every file. Humans read exports more than the string inside model().",
        "src/models/SuccessCenterCategory.js  (schema name, pre-save hook, export)",
        [
            "Rename sucessCenterCategorySchema to successCenterCategorySchema (all uses).",
            "Rename SucessCenterCategory to SuccessCenterCategory.",
            "Keep model(\"SuccessCenterCategory\", ...) as it is.",
            "If any file already imports SucessCenterCategory, update that import too.",
        ],
    )

    pdf.issue(
        10,
        "Some models are missing timestamps",
        "style",
        "Most schemas pass { timestamps: true } as the second argument to new Schema(...). ActivationProgress, AuditLog, and LegalAcceptance do not. Your dummy documents and the architecture PDF still show createdAt / updatedAt for those collections.",
        "Without timestamps, you cannot answer \"when was this created?\" unless you add the field yourself. "
        "Audit logs especially need a time. Legal acceptances already have acceptedAt, but createdAt is still useful and consistent.",
        "timestamps: true is free. Mongoose adds createdAt and updatedAt and keeps them updated. You do not write that logic yourself. "
        "For FinancialLedger, see Issue 24: that one should NOT get a normal updatedAt, because the ledger must not be edited.",
        "src/models/ActivationProgress.js, src/models/AuditLog.js, src/models/LegalAcceptance.js",
        [
            "Change new Schema({ ... }) to new Schema({ ... }, { timestamps: true }) in those three files.",
            "Do not also add createdAt by hand. Mongoose will add it.",
            "Leave FinancialLedger for Issue 24 (special case).",
        ],
    )

    pdf.issue(
        11,
        "Loose arrays and Mixed fields skip validation",
        "style",
        "programQuestions is type: Array. allocationHistory is type: Array. supportingDetails is Schema.Types.Mixed. ContentBlock.body is Mixed with trim: true (trim does not apply to Mixed).",
        "You already hit this with financials: type: Object meant nested fields were not enforced. type: Array and Mixed have the same problem. "
        "Anything can be stored. Bad data will only show up when a controller tries to read .amount or .status and it is missing.",
        "If you know the shape, write the shape. Example for auditHistory (you already did this well in BmisQueue): type: [{ status: String, at: Date, reason: String }]. "
        "If the shape is truly unknown JSON, Mixed is OK, but then the controller must be extra careful.",
        "src/models/SuccessCenterProgram.js (programQuestions), src/models/FollowMeAllocation.js (allocationHistory), src/models/FinancialLedger.js (supportingDetails), src/models/ContentBlock.js (body)",
        [
            "Replace type: Array with a real sub-schema when you know the fields.",
            "For programQuestions, define objects like { question: String, answerType: String } (adjust to your real shape).",
            "For allocationHistory, follow the BmisQueue auditHistory pattern: status, at, amount, reason, or whatever you need.",
            "For supportingDetails, either Mixed (if it is free-form notes) or a small object with note and activationPercentage.",
            "Remove trim: true from ContentBlock.body unless body is a String.",
        ],
    )

    pdf.issue(
        12,
        "LegalAcceptance imports ENUMS but does not use the context enum",
        "style",
        "You created LEGAL_ACCEPTANCE_CONTEXT in constants.js (signup, checkout, founder_activation, other). The context field on LegalAcceptance is a plain String with no enum.",
        "People will type \"sign-up\", \"SignUp\", or \"founder activation\" and you will have three spellings of the same idea. Reports and filters will miss rows. "
        "The import of ENUMS is currently unused, which is a hint that the field was never wired up.",
        "Whenever you add an enum to constants.js, the matching model field should use it in the same commit. Otherwise constants.js becomes a wish list, not a real rule.",
        "src/models/LegalAcceptance.js  (context field)   AND   src/utils/constants.js  (LEGAL_ACCEPTANCE_CONTEXT)",
        [
            "Set context to type: String, enum: Object.values(ENUMS.LEGAL_ACCEPTANCE_CONTEXT).",
            "Add required: [true, \"Context is required\"] if every acceptance must have a source.",
            "Optional: default to ENUMS.LEGAL_ACCEPTANCE_CONTEXT.SIGNUP.",
        ],
    )

    pdf.issue(
        13,
        "FounderPlan uses minlength on an array (that option is for strings)",
        "style",
        "includedSuccessCenters is an array of ObjectIds. You set minlength: [1, \"At least one success center is required\"]. In Mongoose, minlength / maxlength are for String fields, not arrays.",
        "You think the database will reject an empty plan. It may not. A Founder plan with zero programs could be saved. "
        "Then Founder purchase and entitlements have nothing to copy.",
        "For arrays, write a small custom validator: if (!value || value.length < 1) return false. You already wrote custom validators for email, phone, and activation percentage. Same idea.",
        "src/models/FounderPlan.js  (includedSuccessCenters)",
        [
            "Remove minlength from the array field.",
            "Add a validate function that checks value.length >= 1.",
            "Keep required: [true, \"At least one success center is required\"] as extra safety.",
        ],
    )

    pdf.issue(
        14,
        "HTTP_STATUS is missing 409, and error middleware uses a raw 409",
        "style",
        "constants.js HTTP_STATUS has 200, 201, 204, 400, 401, 403, 404, 500. errorMiddleware.js uses statusCode = 409 and statusCode = 400 as plain numbers for duplicate keys and CastError.",
        "The whole point of HTTP_STATUS is one place for codes. If you mix constants and magic numbers, you will forget what 409 means six months from now. "
        "This is a small consistency fix, but it teaches a good backend habit: never sprinkle unexplained numbers in logic.",
        "409 means \"conflict\" (this email already exists). 400 means \"bad request\" (invalid id). Name them in constants and use the names.",
        "src/utils/constants.js  AND  src/middleware/errorMiddleware.js",
        [
            "Add CONFLICT: 409 to HTTP_STATUS (you already have BAD_REQUEST: 400).",
            "In errorMiddleware, replace 409 with HTTP_STATUS.CONFLICT.",
            "Replace the raw 400 for CastError with HTTP_STATUS.BAD_REQUEST.",
        ],
    )

    pdf.h1("Part C  -  Model design  (Issues 15 to 22)")
    pdf.para(
        "These are about how data is stored and protected. If you skip them, controllers will create duplicate rows, "
        "wrong money, and Founders whose benefits change when Todd edits a plan."
    )

    pdf.issue(
        15,
        "Add compound unique indexes for \"one row per user + program\"",
        "design",
        "You indexed some single fields (userId, participantId, email). You almost never indexed two fields together. "
        "Business rules like \"one active Success Center selection per user per program\" are not enforced by the database.",
        "Without a unique compound index, two clicks, two retries, or two server instances can insert two rows for the same user and program. "
        "Your controllers will then show two rents, two activation bars, or two avalanche records. You will spend days debugging \"ghost\" data.",
        "A compound unique index means: this combination must be unique, not each field alone. "
        "Example: many users can select Rent, and one user can select many programs, but one user cannot have two active Rent selections. "
        "In Mongoose: schema.index({ userId: 1, programId: 1 }, { unique: true }). For selections you may also want a partial index so removed rows do not block a new active one. If that feels advanced, start with unique on userId + programId and handle \"removed\" later.",
        "SuccessCenterSelection, ActivationProgress, ProgramCycle, AvalancheQualification, LegalAcceptance (userId + legalDocumentId)",
        [
            "For each of those models, add schema.index({ userId: 1, programId: 1 }, { unique: true }) after the schema (use participantId where the field is named that).",
            "For LegalAcceptance: schema.index({ userId: 1, legalDocumentId: 1 }, { unique: true }).",
            "For Payment you already have unique: true on providerTransactionRef. Keep that. It blocks duplicate Stripe charges.",
            "After the first server start, check MongoDB indexes if you can. Duplicate inserts should now return error 11000 (your middleware already maps that to \"already exists\").",
        ],
    )

    pdf.issue(
        16,
        "Do not store money as a normal JavaScript Number forever",
        "design",
        "amount, goal, price, fundingCapLevel, approvedGoalAmount and similar fields are type: Number. JavaScript numbers are floating point. 0.1 + 0.2 is not exactly 0.3.",
        "This is a money platform. A one-cent error in activation or allocation is a real problem. "
        "Phase 1 is simulation, so you will not notice at first. Phase 2 live money will notice.",
        "Two common approaches: (1) store integer cents, so $100.00 is 10000. Do all math in cents, divide by 100 only when you send JSON to the frontend. "
        "(2) use Schema.Types.Decimal128, which is MongoDB's decimal type. Cents is simpler for a first backend. Pick one approach and use it on every money field. "
        "Percentages that must be exact can also be stored as basis points (12.5% = 1250).",
        "Every model with an amount, price, goal, cap, or payment field: Payment, FinancialLedger, FounderPlan, ActivationProgress, BmisQueue, AvalancheQualification, Recommendation, FollowMeAllocation, SuccessProfile.financials",
        [
            "Decide: integer cents (recommended for now) or Decimal128.",
            "Write the decision in a short comment in constants.js or a small money helper file so you do not forget.",
            "When you write controllers, never do dollars * percent in raw floats without rounding to cents.",
            "You do not have to rewrite every field today, but do not start Founder purchase until Payment.amount follows the rule.",
        ],
    )

    pdf.issue(
        17,
        "FounderPurchase is missing snapshots of price and benefits",
        "design",
        "FounderPurchase only stores userId, planId, activationStatus, purchasedAt, paymentId. It does not copy tier name, price, or benefits version at buy time. You already wrote a long comment on FounderPlan explaining why founderBenefitsVersion exists, but the purchase row does not store that snapshot.",
        "Todd will change plans: prices, caps, included programs. People who already paid must keep the deal they bought. "
        "If the purchase only has planId, every read of \"what did this person buy?\" will look at the live plan, which may have a new price.",
        "A snapshot is a photocopy. At the moment of payment, copy tierName, price, included center count, and benefitsVersion onto the purchase. "
        "After that, editing FounderPlan does not rewrite history. The architecture PDF listed these fields as tierNameSnapshot, priceSnapshot, benefitsVersionSnapshot.",
        "src/models/FounderPurchase.js   (compare with architecture section 6, founderPurchases)",
        [
            "Add tierNameSnapshot (String, enum of plan names).",
            "Add priceSnapshot (Number or cents, matching Issue 16).",
            "Add benefitsVersionSnapshot (String).",
            "In the future purchase controller, copy these from the plan in the same step as creating the purchase. Do not leave them blank.",
        ],
    )

    pdf.issue(
        18,
        "Payment and FounderPurchase point at each other and both want to be required",
        "design",
        "Payment.purchaseId is required. FounderPurchase.paymentId also exists. You cannot create both first. If you create Payment, you need a purchase id. If you create Purchase, you may not have a payment id yet.",
        "This is a chicken-and-egg problem. Stripe also needs a place to store the charge. "
        "Controllers will invent messy \"create empty purchase, then payment, then update purchase\" code, and one step will fail halfway.",
        "Pick one owner. A clean pattern: create FounderPurchase first with paymentId optional and activationStatus pending. After Stripe succeeds, create Payment with purchaseId, then set purchase.paymentId and mark completed. "
        "Only one side should be required. The other side is filled in a second step. Use a MongoDB transaction so both writes succeed or both roll back (Issue 33).",
        "src/models/Payment.js  (purchaseId)   AND   src/models/FounderPurchase.js  (paymentId)",
        [
            "Keep Payment.purchaseId required if Payment always belongs to a purchase.",
            "Keep FounderPurchase.paymentId optional (not required) until payment completes.",
            "Do not make both required. That combination cannot be inserted in one step.",
            "Write this order down in a comment on FounderPurchase so future-you remembers.",
        ],
    )

    pdf.issue(
        19,
        "Auto-increment order on Category and Program can clash",
        "design",
        "A pre(\"save\") hook finds the last category/program, takes order, and adds 1. Two creates at the same time can both read order 5 and both write order 6.",
        "You will get two programs with the same order. The admin UI sort will look random. This is called a race condition: two processes racing, last one wins, both think they are unique.",
        "For Phase 1 with one admin, you may never see it. It is still worth knowing. Better options: let the admin send order from the UI, or unique-index { categoryId: 1, order: 1 } on programs so the second insert fails and you retry. "
        "Also, order is required on Category but the hook overwrites it on new docs. The client is forced to send a dummy order that you ignore. That is confusing.",
        "src/models/SuccessCenterCategory.js  AND  src/models/SuccessCenterProgram.js  (pre save hooks)",
        [
            "For now: make order not required, because the hook sets it.",
            "Later: add a unique index on (categoryId, order) for programs.",
            "Do not treat this as a crash bug. Fix the required mismatch now; unique index can wait until admin create is written.",
        ],
    )

    pdf.issue(
        20,
        "Password hashing only runs on .save(), not on findByIdAndUpdate",
        "design",
        "userSchema.pre(\"save\") hashes the password with bcrypt. That hook does not run for User.findByIdAndUpdate(...) or findOneAndUpdate.",
        "If a future \"change password\" controller does findByIdAndUpdate({ password: req.body.password }), the password is stored as plain text. Anyone who reads the database can see it. That is a serious security bug.",
        "Mongoose hooks are not magic for every query. pre(\"save\") runs when you create a document and then .save(). It also runs on user.save() after you change fields. "
        "It does not run on update queries that go straight to MongoDB. Rule for you: never update password with findByIdAndUpdate. Load the user, set user.password = newPassword, then user.save().",
        "src/models/User.js  (pre save hook around lines 189 to 194). Remember this when you write the password controller.",
        [
            "Keep the pre(\"save\") hash hook.",
            "When you write change-password, use findById, assign password, call save().",
            "Optional later: also add a pre(\"findOneAndUpdate\") that blocks password changes or hashes them there. The save() rule is enough for a first backend.",
            "You already set select: false on password. Good. When comparing login passwords, query with .select(\"+password\").",
        ],
    )

    pdf.issue(
        21,
        "fullName virtual will not appear in API JSON",
        "design",
        "You added userSchema.virtual(\"fullName\"). Virtuals are computed, not stored. By default, Mongoose does not include virtuals when you res.json(user).",
        "You will think fullName is broken. It is not. It is just turned off in JSON. This is a common first-Mongoose surprise.",
        "Enable it with schema options: toJSON: { virtuals: true }, toObject: { virtuals: true }. You can also hide __v and password there. "
        "Do this once on User. Other models can copy it if they get virtuals later.",
        "src/models/User.js  (schema options next to timestamps: true)",
        [
            "Change the schema options to include timestamps, toJSON, and toObject.",
            "Example: { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }.",
            "Optional: in toJSON.transform, delete ret.password and ret.__v so they never leak.",
        ],
    )

    pdf.issue(
        22,
        "User.status defaults to active while emailVerified defaults to false",
        "design",
        "A new user can be status: active and emailVerified: false at the same time. The architecture says email must be verified before payment.",
        "Controllers will have to remember an extra rule: \"active does not mean verified.\" If someone forgets, a user might buy a Founder plan before confirming email.",
        "Make the defaults tell the truth. Default status to pending_verification. When email is verified, set status to active and emailVerified to true together. "
        "Also, the User status enum only allows active and pending_verification, while AUTH_STATUS in constants also has inactive, blocked, deleted. Decide whether User.status should allow those extra states. If yes, add them to the model's enum. If no, do not list them in AUTH_STATUS or split \"account status\" from \"auth status\".",
        "src/models/User.js  (status and emailVerified)   AND   src/utils/constants.js  (AUTH_STATUS)",
        [
            "Set status default to ENUMS.AUTH_STATUS.PENDING_VERIFICATION.",
            "Keep emailVerified default false.",
            "In the verify-email controller (later), set both emailVerified = true and status = active.",
            "Either add INACTIVE, BLOCKED, DELETED to the User status enum, or stop listing them in AUTH_STATUS if you will not use them.",
        ],
    )

    pdf.h1("Part D  -  Architecture gaps  (Issues 23 to 27)")
    pdf.para(
        "These match Todd's architecture PDF. They are not typos. They are missing pieces. "
        "If you start controllers without them, business rules will be hidden inside Express handlers and will be hard to test."
    )

    pdf.issue(
        23,
        "founderEntitlements collection is missing",
        "design",
        "The architecture has a dedicated founderEntitlements collection so every included Success Center is tracked, and Founders are never charged again when a future center unlocks. Your repo has FounderPlan and FounderPurchase, but no FounderEntitlement model.",
        "Without this table, you will try to store \"which programs are included\" only on the plan or only on the purchase. "
        "That cannot handle \"included at purchase\" vs \"unlocked later\", used vs remaining counts, or eligibility per program. The PDF called this out as a new collection for a reason.",
        "One purchase can create several entitlement rows (one per included program, or counters plus program ids). Each row should know: user, purchase, program, entitlement type, whether separate activation is required, eligibility. "
        "You had a stub file earlier (FounderEntitlements). Build it the same way you built BmisQueue: dummy document + architecture section 7 + your current model style.",
        "New file: src/models/FounderEntitlement.js   plus enums in src/utils/constants.js",
        [
            "Add enums: entitlement type (included_at_purchase | unlocked_later), eligibility (eligible | pending_review | ineligible), growth period status (not_started | in_progress | completed).",
            "Create FounderEntitlement with userId, purchaseId, founderTier, programId, counts if you need them, entitlementType, unlockDate, benefitsVersion, separateActivationRequired, eligibilityStatus, growthPeriodStatus, timestamps.",
            "Add FounderEntitlement to AUDIT_LOG_TARGET_TYPE.",
            "Do this before writing the Founder purchase controller, because that controller must create these rows.",
        ],
    )

    pdf.issue(
        24,
        "FinancialLedger should be append-only (no quiet edits)",
        "design",
        "The architecture says the ledger is never overwritten. Your schema uses { timestamps: true }, which adds updatedAt and makes updates look normal. There is no guard against findByIdAndUpdate.",
        "If a controller \"fixes\" a ledger row, you lose history. In a money system, a mistake is corrected by adding a new reversal row, not by editing the old row.",
        "Two practical steps: (1) use timestamps: { createdAt: true, updatedAt: false } so Mongoose does not track updates. You already have createdDate as its own field. "
        "(2) Later, add a pre(\"findOneAndUpdate\") / pre(\"updateOne\") hook that throws an error: \"Ledger entries cannot be updated.\" Controllers should only call create().",
        "src/models/FinancialLedger.js",
        [
            "Replace { timestamps: true } with { timestamps: { createdAt: true, updatedAt: false } }.",
            "Keep createdDate as required if you want an official ledger date separate from Mongo's createdAt. If that feels duplicate, pick one and use it everywhere. Do not keep createdDate2 (that dummy field was empty on purpose).",
            "When you write ledger services, only use FinancialLedger.create(...). Never update.",
        ],
    )

    pdf.issue(
        25,
        "Follow Me 12.5 percent defaults are hard-coded",
        "design",
        "directedAllocationPercent and widerBmisAllocationPercent default to 12.5 in the schema. Your architecture rule is: all rules live in the settings collection, never hard-coded.",
        "If Todd changes Follow Me to 10% and 15%, you would have to change code and redeploy. New rows would still get 12.5 until you remember to edit the model. Old rows should keep the percent they were created with (snapshot idea again).",
        "The model can have no default, or default undefined. The service that creates a FollowMeAllocation should read settings (followMe.directedPct, followMe.widerPct) and copy those numbers onto the new row. After that, the row does not change if settings change.",
        "src/models/FollowMeAllocation.js  AND later the settings keys followMe.directedPct and followMe.widerPct",
        [
            "Remove the hard-coded default: 12.5 from both fields (keep required, or set default undefined).",
            "Do not put 12.5 in constants.js either if the real source of truth is settings.",
            "When you write the Follow Me service, read Setting by key and copy the values into the new document.",
        ],
    )

    pdf.issue(
        26,
        "Role naming: architecture says participant, code says user",
        "style",
        "The architecture enum for role is admin | participant. Your ENUMS.ROLES is ADMIN: \"admin\", USER: \"user\". The User model uses those values.",
        "This is not a crash. It will confuse the frontend and the docs. Every time someone reads the PDF they will look for \"participant\" and find \"user\". Pick one word and use it in the database, the API, and the docs.",
        "\"user\" is a fine name if you document it. \"participant\" matches Todd's language. If you rename, do it before any real data exists.",
        "src/utils/constants.js  (ROLES)  AND  src/models/User.js  (role field)",
        [
            "Decide with the team: keep \"user\" or switch to \"participant\".",
            "If you switch, change the constant value to \"participant\" and update the User enum/default.",
            "If you keep \"user\", add a one-line comment that participant in the PDF means role user in the API.",
        ],
    )

    pdf.issue(
        27,
        "Clean leftover comments and commented-out rules",
        "style",
        "Several models still have large commented blocks: required description on Category, type: Object notes, futureProgramUnlocks, role required, learning comments like \"Following are called hooks in mongoose\".",
        "Comments that teach you are useful while learning. Commented-out code that might be turned on later is dangerous: nobody knows if it is the real rule. "
        "Before controllers, keep short comments that explain why (like the FounderPlan benefits version note). Remove dead code.",
        "If a field is optional, write required: false or omit required. Do not leave three commented required lines above it. That noise hides the real schema.",
        "SuccessCenterCategory.js, SuccessCenterProgram.js, FounderPlan.js, User.js, SuccessProfile.js",
        [
            "Delete commented-out field options that you are not going to use.",
            "Keep one-line why comments where a future reader would ask \"why is this here?\"",
            "Move long teaching notes (like the FounderPlan benefits paragraph at the bottom) to this PDF or a README, not the bottom of a model file.",
        ],
    )

    pdf.h1("Part E  -  Habits before you write controllers  (Issues 28 to 34)")
    pdf.para(
        "You do not need to build all of this on day one of controllers. You should decide the shape now, so the first route does not invent a second style."
    )

    pdf.issue(
        28,
        "Add a small AppError helper",
        "habit",
        "errorMiddleware already reads err.statusCode and err.message. Controllers will be tempted to write res.status(404).json(...) in every function. That duplicates response shape and skips the middleware.",
        "If every controller sends its own JSON, some will forget success: false, some will use error instead of message, and the frontend will break in random places.",
        "Create a tiny class: class AppError extends Error { constructor(message, statusCode) { ... } }. Then in a controller: throw new AppError(\"User not found\", 404). "
        "The error middleware catches it and sends { success: false, message }. One shape, every time. You already started this pattern. Finish it.",
        "New file idea: src/utils/appError.js   used by future controllers, handled by src/middleware/errorMiddleware.js",
        [
            "Create AppError with message and statusCode.",
            "In errorMiddleware, if err is AppError, use those fields (you already use statusCode).",
            "Rule: controllers throw, they do not res.json error bodies by hand (except maybe rare cases).",
        ],
    )

    pdf.issue(
        29,
        "Do not send raw err.message on unexpected 500 errors",
        "habit",
        "errorMiddleware does: let message = err.message || \"Internal Server Error\". For unknown bugs, err.message can be a MongoDB stack or a file path. That gets sent to the client.",
        "Attackers and confused users should not see internal details. Validation errors (400) should stay specific. 500 should stay generic.",
        "Pattern: if you know the error type (ValidationError, 11000, AppError, JWT), send a safe, useful message. Else log the real error on the server and return \"Something went wrong\".",
        "src/middleware/errorMiddleware.js",
        [
            "Keep detailed messages for ValidationError, CastError, duplicate key, and AppError.",
            "For anything else, set message to a generic string and still console.error(err) (or a logger later).",
            "Do not send stack traces in JSON.",
        ],
    )

    pdf.issue(
        30,
        ".env.example is gitignored, so nobody sees which env vars are needed",
        "habit",
        ".gitignore ignores .env (good) and also .env.example (usually bad). .env has secrets. .env.example has empty keys: MONGO_URI=, PORT=, JWT_SECRET= with no real values.",
        "The next person (or you on a new laptop) will not know which variables to set. The server will fail with process.env.MONGO_URI undefined.",
        "Commit .env.example. Never commit .env. You already load dotenv in server.js. Good.",
        ".gitignore  AND  a new .env.example at the project root (do not put real passwords in it)",
        [
            "Remove .env.example from .gitignore (keep .env ignored).",
            "Create .env.example listing MONGO_URI, PORT, and later JWT_SECRET, STRIPE keys, with fake placeholder values.",
            "Never paste real Atlas passwords into the example file.",
        ],
    )

    pdf.issue(
        31,
        "Agree on folders before the first controller",
        "habit",
        "Right now you have models, config, middleware, utils, app.js, server.js. That is a good start. When controllers appear, people often dump all logic into one file.",
        "If BMIS rules live inside Express handlers, you cannot reuse them (from a cron job, from a second route, from a test) without copying. The architecture said rules live in settings. Services are the place that reads settings and applies them.",
        "A simple layout: routes choose the URL and call one controller. Controllers read req, call a service, send res. Services talk to models and settings. Middleware does auth and validation. "
        "Keep controllers thin. If a function uses two models, it belongs in a service.",
        "Plan these folders: src/routes, src/controllers, src/services, src/validators, src/middleware",
        [
            "Create empty folders when you start auth (do not wait until the fifth feature).",
            "First feature: auth + users only. Not Avalanche. Not ledger.",
            "One route file per area: authRoutes.js, userRoutes.js, later founderRoutes.js.",
            "Do not put Mongo queries in app.js.",
        ],
    )

    pdf.issue(
        32,
        "Validate req.body at the door, not only in Mongoose",
        "habit",
        "Mongoose required and enum are your last check. They run when you save. A controller that trusts req.body can still pass extra fields, the wrong type, or a huge payload.",
        "You already limit JSON size to 100kb in app.js. Good. Also validate the shape of each request: email is email, password meets rules, programId is an id. "
        "Use Joi or Zod (or express-validator). If validation fails, return 400 before you touch the database.",
        "This also stops mass assignment: a user sending role: \"admin\" in a signup body. Your User model defaults role to user, which helps, but a validator that only allows firstName, lastName, email, password, phone, country is safer.",
        "Future: src/validators/authValidators.js  plus a middleware that runs the schema",
        [
            "When you write signup, list the allowed body fields in a validator.",
            "Reject unknown fields.",
            "Let Mongoose still validate on save as a second net.",
        ],
    )

    pdf.issue(
        33,
        "Use a MongoDB transaction for Founder purchase (money + entitlements)",
        "habit",
        "Founder activation is not one insert. It is payment record + purchase + entitlement rows + maybe permanentFounderNumber on User. If step 3 fails, you must not keep steps 1 and 2.",
        "Without a transaction, you get a paid Stripe charge, a missing purchase, and a user with no Founder number. Support cannot tell what happened. The architecture asked for transaction-safe updates on payment, purchase, entitlements, and Founder number.",
        "MongoDB transactions need a replica set. Atlas already is one. Locally you may need a replica set too. In code: const session = await mongoose.startSession(); session.startTransaction(); ... commit or abort. "
        "You do not need this on Hello World. You do need it on the purchase service. Remember it now so you do not write purchase as three separate creates.",
        "Future Founder purchase service, using Payment, FounderPurchase, FounderEntitlement, User",
        [
            "Do not implement this until you write the purchase endpoint.",
            "When you do, wrap the writes in one session.",
            "If any write fails, abort. Return a clear error. Do not leave half a Founder.",
        ],
    )

    pdf.issue(
        34,
        "Enable virtuals / id and a consistent API response shape",
        "habit",
        "Your health route returns { success: true, message: \"...\" }. Errors return { success: false, message }. Keep that forever. When you return data, use { success: true, data: user } or { success: true, data: { users, count } }. Do not sometimes send the user at the top level and sometimes inside data.",
        "Frontends break when every endpoint feels different. Pick one envelope now. Also decide: send _id or id. Mongoose can expose id if you want. Do not send password, hashes, or __v.",
        "This is not a model bug. It is an agreement with your future self. Write it down and follow it on the first controller.",
        "src/app.js (health route as the example)  AND  future controllers",
        [
            "Success: { success: true, message?, data? }",
            "Fail: { success: false, message }  (message can be a string or an array of validation messages, you already return an array for ValidationError).",
            "Never return password. You already have select: false. Still never map it into JSON by hand.",
        ],
    )


def add_order(pdf: ReviewPDF):
    pdf.add_page()
    pdf.h1("Suggested order of work this week")
    pdf.para(
        "If you only have a few hours, do not start at Issue 34. Use this order. "
        "Each group should leave the project in a working state."
    )

    pdf.h2("Day 1  -  Make the models load")
    pdf.bullet("Issues 1, 2, 3, 4, 5. Server should start. Imports should work.")
    pdf.bullet("Quick test: import every model from a small script, or just boot nodemon and watch for red errors.")

    pdf.h2("Day 2  -  One enum style and spelling")
    pdf.bullet("Issues 6, 7, 8, 9, 12, 14. constants.js and User/SuccessProfile enums.")
    pdf.bullet("Search the repo for the old misspellings after you rename.")

    pdf.h2("Day 3  -  Timestamps, arrays, indexes, purchase shape")
    pdf.bullet("Issues 10, 11, 13, 15, 17, 18.")
    pdf.bullet("Add FounderEntitlement (Issue 23) on this day if you can. Purchase depends on it.")

    pdf.h2("Day 4  -  Money, ledger, defaults")
    pdf.bullet("Issues 16, 22, 24, 25, 26.")
    pdf.bullet("Write down the cents decision somewhere you will see it.")

    pdf.h2("Day 5  -  Hygiene and controller prep")
    pdf.bullet("Issues 19, 20, 21, 27, 28, 29, 30, 31, 32, 33, 34.")
    pdf.bullet("Create folders. Create AppError. Create .env.example.")
    pdf.bullet("Then write only signup / login. Nothing else.")

    pdf.callout(
        "When are you \"done\" with models?",
        "When Issues 1 to 5 are gone, every model exports, enums match constants, purchase can snapshot a plan, entitlements exist, and you have unique indexes for user+program. "
        "You do not need perfect money-cents on every field before signup. You do need it before Payment goes live.",
        TEAL,
    )

    pdf.h2("First controllers (after this list)")
    pdf.para("Do not start with Avalanche or BMIS queues. This order will teach you the stack without money risk:")
    pdf.bullet("1. Auth: signup, login, me, verify email.")
    pdf.bullet("2. Users: read/update own profile (no password via findByIdAndUpdate).")
    pdf.bullet("3. Success Profile: create/update the one profile per user (you already unique-index userId).")
    pdf.bullet("4. Catalog: list categories and programs (read-only for participants).")
    pdf.bullet("5. Founder plans + purchase (transactions, snapshots, entitlements).")
    pdf.bullet("6. Success Center selection + recommendations.")
    pdf.bullet("7. Activation progress, program cycles, then queues and ledger (simulation).")

    pdf.h2("Quick tick list (print this page)")
    items = [
        "1  ProgramCycle Schema typo",
        "2  ActivationProgress import ENUMS",
        "3  SuccessProfile export default",
        "4  FOUNDER_TIER name in constants",
        "5  FollowMe ref User not Users",
        "6  Object.values enums everywhere",
        "7  User allows qualified / disqualified / expired",
        "8  Fix enum spelling",
        "9  SuccessCenterCategory spelling",
        "10 Timestamps on 3 models",
        "11 Real sub-schemas instead of Array/Mixed where possible",
        "12 LegalAcceptance context enum",
        "13 FounderPlan array min length validator",
        "14 HTTP_STATUS.CONFLICT",
        "15 Compound unique indexes",
        "16 Money as cents (decision + Payment first)",
        "17 FounderPurchase snapshots",
        "18 Payment / purchase required-ref order",
        "19 Category/Program order required vs hook",
        "20 Password only via save()",
        "21 User virtuals in toJSON",
        "22 pending_verification default",
        "23 FounderEntitlement model",
        "24 Ledger append-only",
        "25 Follow Me percents from settings",
        "26 Role user vs participant",
        "27 Remove dead comments",
        "28 AppError class",
        "29 Safe 500 messages",
        "30 Commit .env.example",
        "31 Folder plan: routes/controllers/services",
        "32 Validate req.body",
        "33 Transactions on purchase",
        "34 One JSON response shape",
    ]
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*SLATE)
    for item in items:
        pdf.ensure(7)
        pdf.multi_cell(pdf.content_width(), 5.2, f"[  ]   {item}")

    pdf.ln(6)
    pdf.para(
        "You are doing real backend work: models, enums, refs, and an architecture that separates money from display. "
        "The list above is not a failure report. It is a map. Tick it in order, then write auth. "
        "If you want help applying a group of issues in the repo next, start with Part A (1 to 5) in Cursor.",
        size=10.5,
        leading=5.6,
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf = ReviewPDF()
    add_cover(pdf)
    add_howto(pdf)
    add_issues(pdf)
    add_order(pdf)
    pdf.output(str(OUT_PATH))
    also = Path(r"D:\Client Projects\Share Fund System (SFS)\Share-Fund-System-BE\docs")
    also.mkdir(parents=True, exist_ok=True)
    copy_path = also / OUT_PATH.name
    copy_path.write_bytes(OUT_PATH.read_bytes())
    print(f"Wrote {OUT_PATH}")
    print(f"Copied {copy_path}")


if __name__ == "__main__":
    main()
