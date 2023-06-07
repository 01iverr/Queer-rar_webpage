function checkAge() {
  var minage = document.getElementById("minage")
  var maxage = document.getElementById("maxage")
  if (minage.value>100 || minage.value<18){
    minage.value =18;
    return;
  }
  if (maxage.value>100 || maxage.value<18){
    maxage.value =100;
    return;
  }
  if (minage.value > maxage.value) {
    minage.setCustomValidity("Max age > Min age");
    minage.reportValidity();
    return;
  }
  maxage.setCustomValidity("");
  minage.setCustomValidity("");
}

function displayMessages() {
  if (document.getElementById('Ag').checked) {
    document.getElementById("agmess").style.visibility = "visible";
    document.getElementById("dimess").style.visibility = "hidden";

  } else if (document.getElementById('Di').checked) {
    document.getElementById("agmess").style.visibility = "hidden";
    document.getElementById("dimess").style.visibility = "visible";
  }
}
