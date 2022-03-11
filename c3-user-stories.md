## User Story 1
As a student, I want to be able to be able to upload my own dataset, so that I can query custom datasets.


#### Definitions of Done(s)
Scenario 1: Valid File upload

Given: The student is on the homepage.  
When: The student clicks upload and selects a valid file. Definition of valid: name must be either rooms.zip or courses.zip and only
1 of each type (rooms.zip or courses.zip) can be uploaded at a time).  
Then: The application stores the dataset on disk.

Scenario 2: Invalid File upload

Given: The student is on the homepage.  
When: The student clicks upload and selects an invalid file (see definition above).\
Then: The application does not store the dataset on disk.


## User Story 2
As a student, I want to be able to see the total number of students who passed and failed a specific course in a specific year, so that I can determine the fail rate of a course.


#### Definitions of Done(s)
Scenario 1: Student enters a course (dept + id) and year that exists in the dataset they uploaded.

Given: The student is on the homepage and has uploaded a valid dataset.  
When: The student enters a valid course and year.\
Then: The application displays the total number of students who failed and passed.

Scenario 2: Student enters a course (dept + id) or year that does not exist in the dataset they uploaded.

Given: The student is on the homepage and has uploaded a valid dataset.
When: The student enters an invalid course or year.\
Then: The application does not display the data for the course.


