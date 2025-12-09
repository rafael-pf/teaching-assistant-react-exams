Feature: Exam autocorrection service
    As a backend system
    I want to correct submitted exams
    So that grades are calculated and stored correctly

    @autocorrection-service
    Scenario: Autocorrecting closed questions in an exam
        Given student "12345678901" answered "a" and "b" for questions "1" and "2" respectively in exam "1"
        And the correct answers for those questions are "a" and "b"
        When the system autocorrects the exam "1"
        Then student "12345678901" is registered with grade "100" for exam "1"

    @autocorrection-service
    Scenario: Autocorrecting all students closed questions in an exam
        Given class "1" has students with CPFs "12345678901" and "12345678902"
        And student "12345678901" answered "1" and student "12345678902" answered "2" for question "1" in exam "2"
        And the correct answer for question "1" is "2"
        When the system autocorrects all tests in exam "2"
        Then student "12345678901" is registered with grade "0" for exam "2"
        And student "12345678902" is registered with grade "100" for exam "2"

    @autocorrection-service
    Scenario: Student did not answer all closed questions in an exam
        Given exam "1" has questions "1", "2" and "3"
        And correct answers are "a", "b" and "c"
        And student "12345678901" answered only "a" and "b" in exam "1"
        When the system autocorrects the exam "1"
        Then student "12345678901" is registered with grade "66.7" for exam "1"

    @autocorrection-service
    Scenario: Student did not answer the exam
        Given student "12345678903" did not submit any response for exam "1"
        When the system autocorrects exam "1"
        Then student "12345678903" has no grade record (status: not answered)

    @autocorrection-service
    Scenario: Teacher did not pass an exam to be corrected
        Given no exam is specified for correction
        When the system tries to autocorrect without exam
        Then the system returns an error indicating that no exam was selected

    @autocorrection-service
    Scenario: Exam was already corrected
        Given exam "1" was already corrected and has grades
        When the system tries to autocorrect exam "1" again
        Then the system returns a conflict error (exam already corrected)

    @autocorrection-service
    Scenario: Exam has no answer key
        Given exam "1" has questions "1" and "2"
        And there is no correct answer defined
        When the system tries to autocorrect exam "1"
        Then the system returns an error (missing answer key)

    @autocorrection-service
    Scenario: Exam does not exist
        Given exam "999" does not exist
        When the system tries to autocorrect exam "999"
        Then the system returns an error (exam not found)

    @autocorrection-service
    Scenario: No student submitted the exam
        Given exam "1" exists
        And no students submitted answers
        When the system autocorrects exam "1"
        Then no grades are updated
