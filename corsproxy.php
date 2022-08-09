<?php


error_reporting(error_reporting() & ~E_NOTICE); // evil

// config
$enable_jsonp    = false;
$enable_native   = false;
$valid_url_regex = '/.*/';

// ############################################################################

$url = $_GET['url'];

if (!$url) {

    // Passed url not specified.
    $contents = 'ERROR: url not specified';
    $status = array('http_code' => 'ERROR');
} else if (!preg_match($valid_url_regex, $url)) {

    // Passed url doesn't match $valid_url_regex.
    $contents = 'ERROR: invalid url';
    $status = array('http_code' => 'ERROR');
} else {

    $ch = curl_init($url);

    // @lf get domain from url and keep it around
    $parts = parse_url($url);
    $domain = $parts['scheme'] . "://" . $parts['host'];

    if (strtolower($_SERVER['REQUEST_METHOD']) == 'post') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $_POST);
    }

    if ($_GET['send_cookies']) {
        $cookie = array();
        foreach ($_COOKIE as $key => $value) {
            $cookie[] = $key . '=' . $value;
        }
        if ($_GET['send_session']) {
            $cookie[] = SID;
        }
        $cookie = implode('; ', $cookie);

        curl_setopt($ch, CURLOPT_COOKIE, $cookie);
    }

    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, ""); // @lf guess encoding automagically
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // Skip SSL Verification

    // curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);

    list($header, $contents) = preg_split('/([\r\n][\r\n])\\1/', curl_exec($ch), 2);

    // @lf filter any relative urls and replace them with absolute urls
    $rep['/href="(?!https?:\/\/)(?!data:)(?!#)/'] = 'href="' . $domain;
    $rep['/src="(?!https?:\/\/)(?!data:)(?!#)/'] = 'src="' . $domain;
    $rep['/href=\'(?!https?:\/\/)(?!data:)(?!#)/'] = 'href="' . $domain;
    $rep['/src=\'(?!https?:\/\/)(?!data:)(?!#)/'] = 'src="' . $domain;
    $rep['/@import[\n+\s+]"\//'] = '@import "' . $domain;
    $rep['/@import[\n+\s+]"\./'] = '@import "' . $domain;

    // @lf warning: clears previous contents
    $contents = preg_replace(array_keys($rep), array_values($rep), $contents);

    $status = curl_getinfo($ch);

    curl_close($ch);
}

// Split header text into an array.
$header_text = preg_split('/[\r\n]+/', $header);

if ($_GET['mode'] == 'native') {
    if (!$enable_native) {
        $contents = 'ERROR: invalid mode';
        $status = array('http_code' => 'ERROR');
    }

    // Propagate headers to response.
    foreach ($header_text as $header) {
        if (preg_match('/^(?:Content-Type|Content-Language|Set-Cookie):/i', $header)) {
            header($header);
        }
    }

    print $contents;
} else {

    // $data will be serialized into JSON data.
    $data = array();

    // Propagate all HTTP headers into the JSON data object.
    if ($_GET['full_headers']) {
        $data['headers'] = array();

        foreach ($header_text as $header) {
            preg_match('/^(.+?):\s+(.*)$/', $header, $matches);
            if ($matches) {
                $data['headers'][$matches[1]] = $matches[2];
            }
        }
    }

    // Propagate all cURL request / response info to the JSON data object.
    if ($_GET['full_status']) {
        $data['status'] = $status;
    } else {
        $data['status'] = array();
        $data['status']['http_code'] = $status['http_code'];
    }

    // Set the JSON data object contents, decoding it from JSON if possible.

    $doc = new DOMDocument();
    $doc->loadHTML($contents);
    $ClassName = 'ranking_table';
    $Elements = $doc->getElementsByTagName("table");
    // var_dump($Elements);
    $Matched = array();
    for ($i = 0; $i < $Elements->length; $i++) {
        // var_dump($Elements->item($i));
        // var_dump($Elements->item($i)->attributes->getNamedItem('class'));
        if ($Elements->item($i)->attributes->getNamedItem('class')) {
            if (strpos($Elements->item($i)->attributes->getNamedItem('class')->nodeValue, $ClassName) !== -1) {
                $Matched[] = $Elements->item($i);
            }
        }
    }
    $retVal = array();
    if (count($Matched) > 0) {
        $table = $Matched[0];
        $players = $table->getElementsByTagName('tr');
        for ($i = 0; $i < $players->length; $i++) {
            $items = $players->item($i)->getElementsByTagName('td');
            $name = trim($items->item(2)->textContent);

            $marketValue = $items->item(6)->textContent;
            $marketValue = str_replace('€', '', $marketValue);
            $marketValue = str_replace('.', '', $marketValue);
            $marketValueChange = $items->item(8)->textContent;
            $marketValueChange = str_replace('€', '', $marketValueChange);
            $marketValueChange = str_replace('.', '', $marketValueChange);


            if ($name) {
                $value = array(
                    'name' => $name,
                    'marketValue' => $marketValue,
                    'marketValueChange' => $marketValueChange
                );

                $retVal[] = $value;
            }
        }
    }

    // var_dump($retVal);
    $data['contents'] = $retVal;

    // Generate appropriate content-type header.
    $is_xhr = strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';
    header('Content-type: application/json');
    header('Access-Control-Allow-Origin: *');

    header('Access-Control-Allow-Methods: GET, POST');

    header("Access-Control-Allow-Headers: X-Requested-With");

    // Get JSONP callback.
    $jsonp_callback = $enable_jsonp && isset($_GET['callback']) ? $_GET['callback'] : null;

    // Generate JSON/JSONP string
    $json = json_encode($data);

    print $jsonp_callback ? "$jsonp_callback($json)" : $json;
}
