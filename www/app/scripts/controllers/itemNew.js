angular.module('app').controller('ItemNewController', function ($scope, $location, Item) {
  var vm = this;
  vm.item = {};
  new ss.SimpleUpload({
    button: 'picture_url', // Button id
    url: 'https://xcsoft.hfut.edu.cn/file_upload.php?app=queue',
    cors: true,
    name: 'imgFile',
    responseType: 'json',
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
    encodeCustomHeaders: true,
    maxSize: 2048, // KB
    onComplete: function (filename, response) {
      if (!response.success) {
        alert(' 上传失败! ' + response.msg);
        return false;
      }
      vm.item.picture_url = response.url;
      $scope.$apply();
    }
  });
  vm.save = function () {
    if (!vm.item.name || !vm.item.price || !vm.item.picture_url) {
      alert('请完整填写表单');
      return;
    }
    Item.save(vm.item).$promise.then(function () {
      $location.path('/items/list');
    });
  }
});
