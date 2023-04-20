// check if the 2 given passwords are the same. If yes then draw the border green else red
function checkPasswords() {
  var password1 = document.forms["formsignup"]["Password1"];
  var password2 = document.forms["formsignup"]["PasswordVer"];
  if (password2.value) { //  password2 isn't null or undefined or empty
    if (password1.value == password2.value) {
      if (!PassValid()) {
        PassValid();
        password2.setCustomValidity("Incorrect password"); // we dont want to make this message visible!
          return;
      }
    } else {
      password2.setCustomValidity("Passwords do not match!");
      password2.reportValidity();
      return;
    }
    password2.setCustomValidity("");
  }
}
///////////////////////////////////////////////////////////////////////////
//is password valid ? lets check and inform user what is going wrong if not.
function PassValid() {
  var pswrd = document.getElementById("Password1")
  // pswrd.setCustomValidity("Be aware that passwrod has to contain at least one uppercase and one lowercase letter,one number. Length of passord 8-12 characters");
  // pswrd.reportValidity();
  //validate first of all the length of the password!
  if (pswrd.value.length < 8) {
    pswrd.setCustomValidity("Your password is too small! Password has to have length between 8 and 12!");
    pswrd.reportValidity();
    return false;
  } else {
    if (pswrd.value.length > 12) {
      pswrd.setCustomValidity("Your password is too big! Password has to have length between 8 and 12!");
      pswrd.reportValidity();
      return false;
    } else {
      var numbers = /[0-9]/;
      if (!(numbers.test(pswrd.value))) { // lets check that doesnt contains at least one number now
        pswrd.setCustomValidity("Password has to have at least one number!");
        pswrd.reportValidity();
        return false;
      } else {
        // lets check that does not contain at least one uppercase letter now
        var upperCaseLetters = /[A-Z]/;
        if (!(upperCaseLetters.test(pswrd.value))) {
          pswrd.setCustomValidity("Password has to have at least one uppercase letter!");
          pswrd.reportValidity();
          return false;
        } else {
          //lets check that does not contain at least one lowercase letter now
          var lowerCaseLetters = /[a-z]/;
          if (!(lowerCaseLetters.test(pswrd.value))) {
            pswrd.setCustomValidity("Password has to have at least one lowercase letter!");
            pswrd.reportValidity();
            return false;
          }
        }
      }
    }
  }
  pswrd.setCustomValidity("Your password is awesome just like you!");
  pswrd.setCustomValidity("");
  return true;
}


// check if the user want to erase their inputs.If yes then clear the form if not dont do it!
function wannareset() {
  if (confirm('You will erase all the data that you fullfilled earlier')) {
    // Reset it!
    // window.location.reload();
    document.getElementById("formsignup").reset();
    console.log('User decided to reset the form');
  } else {
    // Do nothing!
    console.log('User decided not to reset the form');
  }
}

/////////////////////////////////////////////////////////////////////

//check age to be between 16-100
function checkage() {
  var given = document.getElementById("Birth_date")
  var inputyear = new Date(given.value).getFullYear();
  var inputmonth = new Date(given.value).getMonth() + 1;
  var inputday = new Date(given.value).getDate()
  var currentyear = new Date().getFullYear();
  var currentmonth = new Date().getMonth() + 1;
  var currentday = new Date().getDate();
  if (currentyear - inputyear > 100) {
    given.setCustomValidity("Oops something went wrong.You cannot be so old.");
    given.reportValidity();
    return;
  } else if (currentyear - inputyear < 16) {
    given.setCustomValidity("You have to be at least 16 years old to sign up");
    given.reportValidity();
    return;
  } else if (currentyear - inputyear == 16) {
    if (currentmonth - inputmonth > 0) {
      given.setCustomValidity("");
      given.reportValidity();
      return;
    } else if (currentmonth - inputmonth == 0) {
      if (currentday - inputday >= 0) {
        given.setCustomValidity("");
        given.reportValidity();
        return;
      } else {
        given.setCustomValidity("You have to be at least 16 years old to sign up");
        given.reportValidity();
        return;
      }
    }
  } else {
    given.setCustomValidity("");
    given.reportValidity();
    return;
  }
}

// make password visible if u tab in the  checkbox
function makepasswordsVisible(id) {
  var pass = id;
  if (pass.type === "password") {
    pass.type = "text";
  } else {
    pass.type = "password";
  }
}
//////////////////////////////////////////////////////////////////

// check files size
function FileSizeValidation() {
  const ID = document.getElementById("Statute");
  const files = ID.files;
  if (files.length > 0) { //user has uploaded a file
    if (files[0].size >= 2048 * 1024) { // check its size
      ID.setCustomValidity("The selected file must be smaller than 2MB");
      ID.reportValidity();
      return;
    }
    ID.setCustomValidity("");
    ID.reportValidity();
    return;
  }
  ID.setCustomValidity(""); //user has not uploaded a file
}
